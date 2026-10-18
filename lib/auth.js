const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('./db');

// Secret used to sign login cookies (generated once, stored in /data)
const secretFile = path.join(db.DIR, 'secret.key');
let SECRET = process.env.SESSION_SECRET;
if (!SECRET) {
  fs.mkdirSync(db.DIR, { recursive: true });
  if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, crypto.randomBytes(32).toString('hex'));
  SECRET = fs.readFileSync(secretFile, 'utf8');
}

const sign = p => crypto.createHmac('sha256', SECRET).update(p).digest('base64url');

function makeToken(role, id) {
  const p = Buffer.from(JSON.stringify({ r: role, i: id, e: Date.now() + 8 * 3600 * 1000 })).toString('base64url');
  return p + '.' + sign(p);
}

function readToken(tok) {
  if (!tok) return null;
  const [p, s] = tok.split('.');
  if (!p || !s) return null;
  const good = sign(p);
  if (s.length !== good.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(good))) return null;
  try {
    const d = JSON.parse(Buffer.from(p, 'base64url').toString());
    return d.e > Date.now() ? d : null;
  } catch { return null; }
}

function parseCookies(h = '') {
  const o = {};
  h.split(';').forEach(kv => {
    const i = kv.indexOf('=');
    if (i > 0) o[kv.slice(0, i).trim()] = decodeURIComponent(kv.slice(i + 1).trim());
  });
  return o;
}

// Attaches req.user = { role, id, record } when logged in
function middleware(req, res, next) {
  const d = readToken(parseCookies(req.headers.cookie).sid);
  req.user = null;
  if (d) {
    const store = db.get();
    const record = d.r === 'admin' ? store.admins.find(a => a.id === d.i) : store.students.find(s => s.id === d.i);
    if (record) req.user = { role: d.r, id: d.i, record };
  }
  next();
}

const SECURE = process.env.NODE_ENV === 'production' || process.env.RENDER ? '; Secure' : '';
const setLogin = (res, role, id) =>
  res.setHeader('Set-Cookie', `sid=${makeToken(role, id)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${SECURE}`);
const clearLogin = res => res.setHeader('Set-Cookie', 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');

const requireLogin = (req, res, next) => (req.user ? next() : res.redirect('/login'));
const requireAdmin = (req, res, next) => (req.user && req.user.role === 'admin' ? next() : res.redirect('/login'));

module.exports = { middleware, setLogin, clearLogin, requireLogin, requireAdmin };
