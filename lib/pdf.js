// PDF generation (pdfkit) - blue version of the university "Undergraduate Profile" layout
const PDFDocument = require('./minipdf');
const path = require('path');
const cfg = require('./config');
const { fmt } = require('./grading');

const LOGO = path.join(__dirname, '..', 'public', 'logo.jpg');
const BLUE = '#0b3d91', MID = '#1d4ed8', LIGHT = '#dbe7ff', PALE = '#eff5ff', LINE = '#9db9ec', INK = '#0f1c3a';

const text = (doc, s, x, y, w, o = {}) =>
  doc.text(String(s), x, y, { width: w, lineBreak: false, ellipsis: true, ...o });

function header(doc, p, title, W) {
  const s = p.student;
  doc.image(LOGO, 28, 16, { width: 62 });
  doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(19);
  text(doc, cfg.school.name, 100, 18, W - 200, { align: 'center' });
  doc.fontSize(12);
  text(doc, title, 100, 42, W - 200, { align: 'center' });
  doc.font('Helvetica').fontSize(8).fillColor(MID);
  text(doc, cfg.school.motto + (cfg.school.address ? '  |  ' + cfg.school.address : ''), 100, 59, W - 200, { align: 'center' });
  doc.fontSize(7).fillColor('#5b6b8c');
  text(doc, 'Printed: ' + new Date().toLocaleString('en-GB'), W - 150, 22, 122, { align: 'right' });
  doc.moveTo(28, 82).lineTo(W - 28, 82).lineWidth(1.5).strokeColor(BLUE).stroke();

  // student block
  doc.fillColor(INK).font('Helvetica-BoldOblique').fontSize(12);
  text(doc, s.name, 28, 90, 300);
  doc.font('Helvetica-Bold').fontSize(11);
  text(doc, s.regNo, 28, 106, 300);
  doc.font('Helvetica').fontSize(8);
  const mid = W > 700 ? W * 0.4 : W * 0.34;
  doc.font('Helvetica-Bold'); text(doc, 'Class/Programme: ', mid, 91, 90);
  doc.font('Helvetica'); text(doc, s.discipline || '-', mid + 78, 91, W - 230 - (mid + 78) - 8);
  doc.font('Helvetica-Bold'); text(doc, 'Mode of Entry: ', mid, 104, 90);
  doc.font('Helvetica'); text(doc, s.modeOfEntry || '-', mid + 66, 104, 120);
  doc.font('Helvetica-Bold'); text(doc, 'Year of Entry: ', mid, 117, 90);
  doc.font('Helvetica'); text(doc, s.yearOfEntry || '-', mid + 62, 117, 120);
  const rx = W - 230;
  doc.font('Helvetica-Bold'); text(doc, 'Department: ', rx, 91, 60);
  doc.font('Helvetica'); text(doc, s.department || '-', rx + 54, 91, 150);
  doc.font('Helvetica-Bold'); text(doc, 'Status: ', rx, 104, 60);
  doc.font('Helvetica'); text(doc, s.status || 'Active', rx + 34, 104, 150);
}

function pageNumbers(doc, W, H) {
  const r = doc.bufferedPageRange();
  for (let i = 0; i < r.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(7).fillColor('#5b6b8c');
    text(doc, `Page ${i + 1} of ${r.count}`, 28, H - 18, 120);
    text(doc, cfg.school.name + ' - computer generated result profile', 0, H - 18, W - 28, { align: 'right' });
  }
}

// ---------- Full result profile ----------
function transcript(res, p) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, bufferPages: true,
    info: { Title: 'Result Profile - ' + p.student.name, Author: cfg.school.name } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${p.student.regNo.replace(/[^\w-]/g, '_')}_result_profile.pdf"`);
  doc.pipe(res);

  const W = doc.page.width, H = doc.page.height;
  const PER_PAGE = 4, GAP = 10, TOP = 140, FOOT = 92;
  const colW = (W - 56 - GAP * (PER_PAGE - 1)) / PER_PAGE;
  const cols = [0.31, 0.13, 0.17, 0.13, 0.26].map(f => f * colW);
  const chunks = [];
  for (let i = 0; i < p.sessions.length; i += PER_PAGE) chunks.push(p.sessions.slice(i, i + PER_PAGE));
  if (!chunks.length) chunks.push([]);

  chunks.forEach((group, pi) => {
    if (pi > 0) doc.addPage();
    header(doc, p, 'STUDENT ACADEMIC RESULT PROFILE', W);

    // fit row height to the tallest column
    const avail = H - FOOT - TOP;
    const need = se => 16 + se.semesters.length * 40 + 26;
    const rowsOf = se => se.semesters.reduce((a, sm) => a + sm.courses.length, 0);
    const fixed = Math.max(0, ...group.map(need));
    const maxRows = Math.max(1, ...group.map(rowsOf));
    const rh = Math.max(7.5, Math.min(12, (avail - fixed) / maxRows));
    const fs = Math.min(8, rh * 0.68);

    group.forEach((se, ci) => {
      const x = 28 + ci * (colW + GAP);
      let y = TOP;
      doc.rect(x, y, colW, 14).fill(BLUE);
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8.5);
      text(doc, se.session, x + 4, y + 3.5, colW / 2);
      text(doc, se.level, x + colW / 2, y + 3.5, colW / 2 - 4, { align: 'right' });
      y += 17;

      se.semesters.forEach(sm => {
        doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(8);
        text(doc, sm.name + ':::', x, y, colW);
        y += 11;
        // table head
        let cx = x;
        doc.rect(x, y, colW, 10).fill(LIGHT);
        doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(6.5);
        ['Course Code', 'Unit', 'Status', 'GP', 'Credit Pt'].forEach((h, i) => {
          text(doc, h, cx + 2, y + 2.5, cols[i] - 3, { align: i ? 'center' : 'left' });
          cx += cols[i];
        });
        y += 10;
        sm.courses.forEach(c => {
          cx = x;
          doc.rect(x, y, colW, rh).lineWidth(0.4).strokeColor(LINE).stroke();
          doc.fillColor(c.gp === 0 ? '#b91c1c' : INK).font('Helvetica-Bold').fontSize(fs);
          [c.code, c.unit, c.status, c.gp, c.cp].forEach((val, i) => {
            text(doc, val, cx + 2, y + (rh - fs) / 2 + 0.3, cols[i] - 3, { align: i ? 'center' : 'left' });
            cx += cols[i];
          });
          y += rh;
        });
        doc.fillColor(INK).font('Helvetica').fontSize(6.8);
        text(doc, `TNU: ${sm.tnu}  TCP: ${sm.tcp}  GP: ${fmt(sm.gpa)}  CGPA: ${fmt(sm.cgpa)}`, x, y + 2, colW);
        y += 14;
      });

      doc.lineWidth(0.5).rect(x, y, colW, 22).fillAndStroke(PALE, BLUE);
      doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(6.5);
      text(doc, `Summary: CTNU: ${se.ctnu}  CTCP: ${se.ctcp}  CGPA: ${fmt(se.cgpa)}`, x + 3, y + 3, colW - 4);
      text(doc, se.standing, x + 3, y + 12, colW - 4);
    });
  });

  // closing section on the last page
  doc.switchToPage(doc.bufferedPageRange().count - 1);
  const fy = H - FOOT + 8;
  doc.moveTo(28, fy).lineTo(W - 28, fy).lineWidth(1.2).strokeColor(BLUE).stroke();
  doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(10);
  text(doc, 'Outstanding Courses: ', 28, fy + 8, 120);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(8);
  text(doc, p.outstanding.length ? p.outstanding.join(', ') : 'NONE', 135, fy + 10, W - 190);
  doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(10);
  text(doc, 'Disciplinary Status: ', 28, fy + 24, 120);
  doc.fillColor(INK).fontSize(8);
  text(doc, p.student.disciplinary || 'NONE', 135, fy + 26, 300);
  doc.fillColor(BLUE).fontSize(10);
  text(doc, 'Academic Summary: ', 28, fy + 40, 120);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(8);
  const line1 = [`CTNU: ${p.ctnu}`, `CTCP: ${p.ctcp}`, `CTNUP: ${p.ctnup}`, `CGPA: ${fmt(p.cgpa)}`, p.standing, p.classification,
    p.graduating ? 'Graduating' : 'Not Graduating'].join('  |  ');
  const line2 = [p.outstanding.length ? `Outstanding Course(s): ${p.outstanding.length}` : 'No Outstanding Course',
    p.remaining ? `Student needs ${p.remaining} more credit unit(s) to graduate` : 'Credit units requirement met'].join('  |  ');
  text(doc, line1, 135, fy + 42, W - 170);
  text(doc, line2, 135, fy + 54, W - 170);

  pageNumbers(doc, W, H);
  doc.end();
}

// ---------- Single term/semester result ----------
function semester(res, p, se, sm) {
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true,
    info: { Title: `${sm.name} Result - ${p.student.name}`, Author: cfg.school.name } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition',
    `attachment; filename="${p.student.regNo.replace(/[^\w-]/g, '_')}_${se.session.replace('/', '-')}_${sm.sem}.pdf"`);
  doc.pipe(res);

  const W = doc.page.width, H = doc.page.height;
  header(doc, p, `${sm.name.toUpperCase()} RESULT SLIP`, W);
  doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(11);
  text(doc, `${se.session} Session  -  ${se.level}`, 28, 142, W - 56, { align: 'center' });

  const cw = [28, 80, W - 56 - 28 - 80 - 36 - 42 - 42 - 38 - 30 - 46, 36, 42, 42, 38, 30, 46];
  const heads = ['S/N', 'Code', 'Course Title', 'Unit', 'Status', 'Score', 'Grade', 'GP', 'Credit Pt'];
  let y = 164;
  const row = (vals, h, bg, bold, color) => {
    if (bg) doc.rect(28, y, W - 56, h).fill(bg);
    let x = 28;
    doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5);
    vals.forEach((v, i) => {
      text(doc, v, x + 4, y + (h - 8.5) / 2, cw[i] - 6, { align: i > 2 ? 'center' : 'left' });
      x += cw[i];
    });
    doc.moveTo(28, y + h).lineTo(W - 28, y + h).lineWidth(0.4).strokeColor(LINE).stroke();
    y += h;
  };
  row(heads, 18, BLUE, true, '#fff');
  sm.courses.forEach((c, i) =>
    row([i + 1, c.code, c.title || '', c.unit, c.status, c.score, c.grade, c.gp, c.cp], 17, i % 2 ? PALE : null, false, c.gp === 0 ? '#b91c1c' : INK));
  row(['', '', 'TOTAL', sm.tnu, '', '', '', '', sm.tcp], 18, LIGHT, true, BLUE);

  y += 16;
  const box = (label, val, i) => {
    const bw = (W - 56 - 30) / 4, x = 28 + i * (bw + 10);
    doc.lineWidth(0.6).rect(x, y, bw, 42).fillAndStroke(PALE, BLUE);
    doc.fillColor('#5b6b8c').font('Helvetica').fontSize(7);
    text(doc, label.toUpperCase(), x, y + 7, bw, { align: 'center' });
    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(15);
    text(doc, val, x, y + 19, bw, { align: 'center' });
  };
  box('Term/Semester GPA', fmt(sm.gpa), 0);
  box('Cumulative GPA', fmt(sm.cgpa), 1);
  box('Units / Credit Points', `${sm.tnu} / ${sm.tcp}`, 2);
  box('Standing', sm.cgpa >= 1 ? 'Good' : 'Probation', 3);
  y += 62;

  doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(8);
  text(doc, 'GRADING KEY', 28, y, 200);
  doc.fillColor(INK).font('Helvetica').fontSize(8);
  const key = cfg.scale.map((r, i, a) => `${r.grade} = ${i === 0 ? r.min + '-100' : r.min + '-' + (a[i - 1].min - 1)} (${r.gp} pt)`).join('     ');
  text(doc, key, 28, y + 12, W - 56);
  text(doc, 'Status: ' + Object.entries(cfg.statuses).map(([k, v]) => `${k} = ${v}`).join(',  ') + '.   GP = Grade Point;  Credit Pt = Unit x GP;  GPA = Total Credit Pt / Total Units.', 28, y + 26, W - 56);

  y += 80;
  [28, W / 2 + 20].forEach((x, i) => {
    doc.moveTo(x, y + 30).lineTo(x + 180, y + 30).lineWidth(0.6).strokeColor(BLUE).stroke();
    doc.fillColor(INK).font('Helvetica').fontSize(8);
    text(doc, i ? 'Principal / Head of School' : 'Class Teacher / Registrar', x, y + 34, 180);
  });

  pageNumbers(doc, W, H);
  doc.end();
}

module.exports = { transcript, semester };
