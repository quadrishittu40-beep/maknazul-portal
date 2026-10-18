// Minimal dependency-free PDF writer (Helvetica fonts, rectangles, lines, text, one JPEG logo).
// API intentionally mirrors the small part of "pdfkit" that this portal needs.
const fs = require('fs');
const zlib = require('zlib');
const WIDTHS = require('./widths');

const FONTS = ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique'];
const num = n => (Math.round(n * 100) / 100).toString();
const rgb = hex => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.replace(/./g, c => c + c);
  return [0, 2, 4].map(i => num(parseInt(h.substr(i, 2), 16) / 255)).join(' ');
};

function jpegInfo(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7), comps: buf[i + 9] };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error('Bad JPEG');
}

class Doc {
  constructor(o = {}) {
    let [w, h] = o.size === 'A4' || !o.size ? [595.28, 841.89] : o.size;
    if (o.layout === 'landscape') [w, h] = [h, w];
    this.page = { width: w, height: h };
    this.info = o.info || {};
    this.pages = [];
    this._font = 'Helvetica';
    this._size = 12;
    this._state = [];
    this._path = [];
    this._images = [];
    this._out = null;
    this.addPage();
  }

  // ----- pages -----
  addPage() { this._cur = { ops: [] }; this.pages.push(this._cur); return this; }
  bufferedPageRange() { return { start: 0, count: this.pages.length }; }
  switchToPage(i) { this._flush(); this._cur = this.pages[i]; return this; }
  pipe(res) { this._out = res; }

  // ----- state -----
  _flush() { if (this._state.length) { this._cur.ops.push(...this._state); this._state = []; } }
  fillColor(c) { this._state.push(rgb(c) + ' rg'); return this; }
  strokeColor(c) { this._state.push(rgb(c) + ' RG'); return this; }
  lineWidth(w) { this._state.push(num(w) + ' w'); return this; }
  font(f) { this._font = f; return this; }
  fontSize(s) { this._size = s; return this; }
  _y(y) { return this.page.height - y; }

  // ----- paths -----
  rect(x, y, w, h) { this._path.push(`${num(x)} ${num(this._y(y + h))} ${num(w)} ${num(h)} re`); return this; }
  moveTo(x, y) { this._path.push(`${num(x)} ${num(this._y(y))} m`); return this; }
  lineTo(x, y) { this._path.push(`${num(x)} ${num(this._y(y))} l`); return this; }
  _paint(op) { this._flush(); this._cur.ops.push(...this._path, op); this._path = []; return this; }
  fill(c) { if (c) this.fillColor(c); return this._paint('f'); }
  stroke(c) { if (c) this.strokeColor(c); return this._paint('S'); }
  fillAndStroke(f, s) { if (f) this.fillColor(f); if (s) this.strokeColor(s); return this._paint('B'); }

  // ----- text -----
  widthOf(str, font = this._font, size = this._size) {
    const t = WIDTHS[font.includes('Bold') ? 'Helvetica-Bold' : 'Helvetica'];
    let w = 0;
    for (const ch of String(str)) w += t[ch.charCodeAt(0) < 256 ? ch.charCodeAt(0) : 63];
    return (w * size) / 1000;
  }

  text(str, x, y, o = {}) {
    let s = String(str).replace(/[^\x20-\xff]/g, '?');
    if (o.width && this.widthOf(s) > o.width) {
      const dots = o.ellipsis ? '...' : '';
      while (s.length > 1 && this.widthOf(s + dots) > o.width) s = s.slice(0, -1);
      s += dots;
    }
    let tx = x;
    if (o.width && o.align === 'center') tx = x + (o.width - this.widthOf(s)) / 2;
    if (o.width && o.align === 'right') tx = x + o.width - this.widthOf(s);
    this._flush();
    const esc = s.replace(/([\\()])/g, '\\$1');
    const base = this._y(y + this._size * 0.718);
    this._cur.ops.push(`BT /F${FONTS.indexOf(this._font) + 1} ${num(this._size)} Tf ${num(tx)} ${num(base)} Td (${esc}) Tj ET`);
    return this;
  }

  image(file, x, y, o = {}) {
    const data = fs.readFileSync(file);
    const info = jpegInfo(data);
    let idx = this._images.findIndex(im => im.file === file);
    if (idx < 0) { this._images.push({ file, data, info }); idx = this._images.length - 1; }
    const w = o.width, h = (w * info.h) / info.w;
    this._flush();
    this._cur.ops.push(`q ${num(w)} 0 0 ${num(h)} ${num(x)} ${num(this._y(y + h))} cm /Im${idx + 1} Do Q`);
    return this;
  }

  // ----- output -----
  build() {
    this._flush();
    const objs = []; // index = object number - 1
    const add = b => { objs.push(Buffer.isBuffer(b) ? b : Buffer.from(b, 'latin1')); return objs.length; };
    const set = (n, b) => { objs[n - 1] = Buffer.isBuffer(b) ? b : Buffer.from(b, 'latin1'); };

    const catalog = add(''), pagesObj = add('');
    const fontIds = FONTS.map(f => add(`<< /Type /Font /Subtype /Type1 /BaseFont /${f} /Encoding /WinAnsiEncoding >>`));
    const imgIds = this._images.map(im => add(Buffer.concat([
      Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${im.info.w} /Height ${im.info.h} /ColorSpace ${im.info.comps === 1 ? '/DeviceGray' : '/DeviceRGB'} /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.data.length} >>\nstream\n`, 'latin1'),
      im.data, Buffer.from('\nendstream', 'latin1')])));
    const res = `<< /Font << ${fontIds.map((id, i) => `/F${i + 1} ${id} 0 R`).join(' ')} >> /XObject << ${imgIds.map((id, i) => `/Im${i + 1} ${id} 0 R`).join(' ')} >> >>`;

    const pageIds = this.pages.map(p => {
      const z = zlib.deflateSync(Buffer.from(p.ops.join('\n'), 'latin1'));
      const cid = add(Buffer.concat([Buffer.from(`<< /Filter /FlateDecode /Length ${z.length} >>\nstream\n`, 'latin1'), z, Buffer.from('\nendstream', 'latin1')]));
      return add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${num(this.page.width)} ${num(this.page.height)}] /Resources ${res} /Contents ${cid} 0 R >>`);
    });
    set(pagesObj, `<< /Type /Pages /Kids [${pageIds.map(i => i + ' 0 R').join(' ')}] /Count ${pageIds.length} >>`);
    set(catalog, `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);
    const title = String(this.info.Title || '').replace(/[^\x20-\x7e]/g, '').replace(/([\\()])/g, '\\$1');
    const author = String(this.info.Author || '').replace(/[^\x20-\x7e]/g, '').replace(/([\\()])/g, '\\$1');
    const infoId = add(`<< /Title (${title}) /Author (${author}) /Producer (MIA Result Portal) >>`);

    const parts = [Buffer.from('%PDF-1.4\n', 'latin1')];
    const offsets = [];
    let pos = parts[0].length;
    objs.forEach((b, i) => {
      offsets.push(pos);
      const chunk = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), b, Buffer.from('\nendobj\n', 'latin1')]);
      parts.push(chunk); pos += chunk.length;
    });
    let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach(o => { xref += String(o).padStart(10, '0') + ' 00000 n \n'; });
    xref += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${infoId} 0 R >>\nstartxref\n${pos}\n%%EOF\n`;
    parts.push(Buffer.from(xref, 'latin1'));
    return Buffer.concat(parts);
  }

  end() {
    const buf = this.build();
    if (this._out) { this._out.setHeader('Content-Length', buf.length); this._out.end(buf); }
    return buf;
  }
}

module.exports = Doc;
