const path = require('path');
const mini = require('./lib/mini');
const bcrypt = require('./lib/hash');
const cfg = require('./lib/config');
require('./lib/assets');
const db = require('./lib/db');
const auth = require('./lib/auth');
const { buildProfile } = require('./lib/grading');
const pdf = require('./lib/pdf');
const v = require('./lib/views');

db.load();
const store = db.get();

// First-run: create default admin
if (!store.admins.length) {
  store.admins.push({
    id: db.nextId(),
    username: cfg.defaultAdmin.username,
    hash: bcrypt.hashSync(cfg.defaultAdmin.password, 10)
  });
  db.save();
  console.log(`Default admin created -> user: ${cfg.defaultAdmin.username}  pass: ${cfg.defaultAdmin.password}`);
}

const app = mini(path.join(__dirname, 'public'));
app.use(auth.middleware);

const profileOf = id => {
  const s = store.students.find(x => x.id === Number(id));
  return s ? buildProfile(s, store.results.filter(r => r.studentId === s.id)) : null;
};
const html = (res, s) => res.type('html').send(s);
const back = (res, url, text, err) => res.redirect(url + (url.includes('?') ? '&' : '?') + (err ? 'e=' : 'm=') + encodeURIComponent(text));
const flashOf = q => (q.m ? { text: q.m } : q.e ? { text: q.e, err: true } : null);

// ---------- Auth ----------
app.get('/', (req, res) => res.redirect(req.user ? (req.user.role === 'admin' ? '/admin' : `/profile/${req.user.id}`) : '/login'));
app.get('/login', (req, res) => html(res, v.loginPage(flashOf(req.query))));

app.post('/login', (req, res) => {
  const { role, username = '', password = '' } = req.body;
  if (role === 'admin') {
    const a = store.admins.find(x => x.username === username.trim());
    if (a && bcrypt.compareSync(password, a.hash)) { auth.setLogin(res, 'admin', a.id); return res.redirect('/admin'); }
  } else {
    const s = store.students.find(x => x.regNo.toLowerCase() === username.trim().toLowerCase());
    if (s && bcrypt.compareSync(password, s.pinHash)) { auth.setLogin(res, 'student', s.id); return res.redirect(`/profile/${s.id}`); }
  }
  back(res, '/login', 'Invalid login details', true);
});

app.get('/logout', (req, res) => { auth.clearLogin(res); res.redirect('/login'); });

// ---------- Profile & PDFs (student sees only own; admin sees all) ----------
function canView(req, res, next) {
  if (!req.user) return res.redirect('/login');
  if (req.user.role !== 'admin' && String(req.user.id) !== req.params.id) return res.status(403).send('Not allowed');
  const p = profileOf(req.params.id);
  if (!p) return res.status(404).send('Student not found');
  req.profile = p;
  next();
}

app.get('/profile/:id', canView, (req, res) => html(res, v.profilePage(req.profile, req.user, flashOf(req.query))));
app.get('/profile/:id/pdf', canView, (req, res) => pdf.transcript(res, req.profile));

app.get('/profile/:id/semester/:session/:sem/pdf', canView, (req, res) => {
  const session = req.params.session.replace('-', '/');
  const se = req.profile.sessions.find(x => x.session === session);
  const sm = se && se.semesters.find(x => String(x.sem) === req.params.sem);
  if (!sm) return res.status(404).send('Result not found');
  pdf.semester(res, req.profile, se, sm);
});

// ---------- Admin ----------
const A = [auth.requireAdmin];

app.get('/admin', A, (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const list = store.students.filter(s => !q || s.name.toLowerCase().includes(q) || s.regNo.toLowerCase().includes(q));
  html(res, v.adminHome(list, req.query.q || '', flashOf(req.query), req.user));
});

app.post('/admin/students', A, (req, res) => {
  const b = req.body;
  const regNo = (b.regNo || '').trim();
  if (!regNo || !b.name || !b.pin) return back(res, '/admin', 'Reg No, name and PIN are required', true);
  if (store.students.some(s => s.regNo.toLowerCase() === regNo.toLowerCase())) return back(res, '/admin', 'That Reg No already exists', true);
  const s = {
    id: db.nextId(), regNo, name: b.name.trim().toUpperCase(), pinHash: bcrypt.hashSync(b.pin.trim(), 10),
    discipline: b.discipline || '', department: b.department || '', modeOfEntry: b.modeOfEntry || '',
    yearOfEntry: b.yearOfEntry || '', status: 'Active', disciplinary: 'NONE'
  };
  store.students.push(s);
  db.save();
  back(res, `/admin/student/${s.id}`, `Student registered. Login PIN: ${b.pin.trim()}`);
});

app.get('/admin/student/:id', A, (req, res) => {
  const p = profileOf(req.params.id);
  if (!p) return res.status(404).send('Not found');
  html(res, v.adminStudent(p, req.user, flashOf(req.query)));
});

app.post('/admin/student/:id/update', A, (req, res) => {
  const s = store.students.find(x => x.id === Number(req.params.id));
  if (!s) return res.status(404).send('Not found');
  const b = req.body;
  Object.assign(s, {
    name: (b.name || s.name).trim().toUpperCase(), discipline: b.discipline, department: b.department,
    modeOfEntry: b.modeOfEntry, yearOfEntry: b.yearOfEntry, status: b.status, disciplinary: b.disciplinary || 'NONE'
  });
  if (b.pin && b.pin.trim()) s.pinHash = bcrypt.hashSync(b.pin.trim(), 10);
  db.save();
  back(res, `/admin/student/${s.id}`, 'Saved');
});

function cleanResult(studentId, b) {
  const unit = Number(b.unit), score = Number(b.score), semester = Number(b.semester);
  if (!b.session || !b.level || !b.code || !(unit > 0) || !(score >= 0 && score <= 100) || !cfg.periods[semester]) return null;
  return {
    id: db.nextId(), studentId, session: b.session.trim(), level: b.level.trim(), semester,
    code: b.code.trim().toUpperCase(), title: (b.title || '').trim(),
    unit, status: cfg.statuses[b.status] ? b.status : 'C', score
  };
}

function upsert(r) {
  // one entry per student/session/semester/course code
  const i = store.results.findIndex(x => x.studentId === r.studentId && x.session === r.session && x.semester === r.semester && x.code === r.code);
  if (i >= 0) store.results[i] = { ...r, id: store.results[i].id }; else store.results.push(r);
}

app.post('/admin/student/:id/results', A, (req, res) => {
  const id = Number(req.params.id);
  const r = cleanResult(id, req.body);
  if (!r) return back(res, `/admin/student/${id}`, 'Please fill all fields correctly', true);
  upsert(r); db.save();
  back(res, `/admin/student/${id}`, `Added ${r.code}`);
});

app.post('/admin/student/:id/bulk', A, (req, res) => {
  const id = Number(req.params.id);
  let ok = 0, bad = 0;
  String(req.body.lines || '').split(/\r?\n/).forEach(line => {
    if (!line.trim()) return;
    const [code, title, unit, status, score] = line.split(',').map(x => x.trim());
    const r = cleanResult(id, { ...req.body, code, title, unit, status: (status || 'C').toUpperCase(), score });
    if (r) { upsert(r); ok++; } else bad++;
  });
  db.save();
  back(res, `/admin/student/${id}`, `${ok} imported, ${bad} line(s) skipped`, bad > 0 && ok === 0);
});

app.post('/admin/result/:rid/delete', A, (req, res) => {
  const i = store.results.findIndex(x => x.id === Number(req.params.rid));
  const sid = i >= 0 ? store.results[i].studentId : '';
  if (i >= 0) { store.results.splice(i, 1); db.save(); }
  res.redirect(sid ? `/admin/student/${sid}` : '/admin');
});

app.get('/admin/backup', A, (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="portal-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.end(JSON.stringify(store, null, 1));
});

app.post('/admin/restore', A, (req, res) => {
  try {
    const d = JSON.parse(req.body.json);
    if (!Array.isArray(d.students) || !Array.isArray(d.results) || !Array.isArray(d.admins) || !d.admins.length) throw new Error('bad');
    Object.keys(store).forEach(k => delete store[k]);
    Object.assign(store, { seq: 1 }, d);
    db.save();
    auth.clearLogin(res);
    back(res, '/login', 'Backup restored. Please log in again.');
  } catch (e) {
    back(res, '/admin', 'That is not a valid backup file', true);
  }
});

app.get('/admin/password', A, (req, res) => html(res, v.passwordPage(req.user, flashOf(req.query))));
app.post('/admin/password', A, (req, res) => {
  if ((req.body.password || '').length < 6) return back(res, '/admin/password', 'Password too short', true);
  req.user.record.hash = bcrypt.hashSync(req.body.password, 10);
  db.save();
  back(res, '/admin/password', 'Password updated');
});

app.listen(cfg.port, () => console.log(`${cfg.school.name} portal running on http://localhost:${cfg.port}`));
