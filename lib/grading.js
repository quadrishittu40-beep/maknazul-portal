const cfg = require('./config');

function gradeFor(score) {
  const s = Number(score);
  for (const r of cfg.scale) if (s >= r.min) return { grade: r.grade, gp: r.gp };
  return { grade: 'F', gp: 0 };
}

const r2 = n => Math.round(n * 100) / 100;
const fmt = n => (Number.isFinite(n) ? n.toFixed(2) : '0.00');

function standing(cgpa) {
  return cgpa >= 1 ? 'Good Standing' : 'Probation';
}

function classification(cgpa) {
  if (cgpa >= 4.5) return 'First Class';
  if (cgpa >= 3.5) return 'Second Class Upper';
  if (cgpa >= 2.4) return 'Second Class Lower';
  if (cgpa >= 1.5) return 'Third Class';
  if (cgpa >= 1.0) return 'Pass';
  return 'Fail';
}

// Builds the complete academic profile of a student from raw result rows.
function buildProfile(student, rows) {
  const courses = rows
    .map(r => {
      const g = gradeFor(r.score);
      return { ...r, unit: Number(r.unit), score: Number(r.score), grade: g.grade, gp: g.gp, cp: Number(r.unit) * g.gp };
    })
    .sort((a, b) => a.session.localeCompare(b.session) || a.semester - b.semester || a.code.localeCompare(b.code));

  const sessionMap = new Map();
  for (const c of courses) {
    if (!sessionMap.has(c.session)) sessionMap.set(c.session, { session: c.session, level: c.level, semMap: new Map() });
    const s = sessionMap.get(c.session);
    s.level = c.level;
    if (!s.semMap.has(c.semester)) s.semMap.set(c.semester, []);
    s.semMap.get(c.semester).push(c);
  }

  let runU = 0, runP = 0;
  const sessions = [];
  for (const s of sessionMap.values()) {
    const semesters = [];
    for (const [sem, list] of [...s.semMap.entries()].sort((a, b) => a[0] - b[0])) {
      const tnu = list.reduce((a, c) => a + c.unit, 0);
      const tcp = list.reduce((a, c) => a + c.cp, 0);
      runU += tnu; runP += tcp;
      semesters.push({
        sem, name: cfg.periods[sem] || 'Term ' + sem, courses: list,
        tnu, tcp, gpa: tnu ? r2(tcp / tnu) : 0, cgpa: runU ? r2(runP / runU) : 0
      });
    }
    const cgpa = runU ? r2(runP / runU) : 0;
    sessions.push({ session: s.session, level: s.level, semesters, ctnu: runU, ctcp: runP, cgpa, standing: standing(cgpa) });
  }

  // Outstanding = latest attempt of a course is a fail
  const latest = new Map();
  for (const c of courses) latest.set(c.code, c);
  const outstanding = [...latest.values()].filter(c => c.score < cfg.passMark).map(c => c.code);

  const ctnu = runU, ctcp = runP;
  const ctnup = courses.filter(c => c.gp > 0).reduce((a, c) => a + c.unit, 0); // units passed
  const cgpa = ctnu ? r2(ctcp / ctnu) : 0;
  const remaining = Math.max(0, cfg.unitsToGraduate - ctnup);
  const graduating = outstanding.length === 0 && remaining === 0 && ctnu > 0;

  return {
    student, sessions, courses, outstanding,
    ctnu, ctcp, ctnup, cgpa, remaining, graduating,
    standing: standing(cgpa), classification: classification(cgpa)
  };
}

module.exports = { gradeFor, buildProfile, fmt, standing, classification };
