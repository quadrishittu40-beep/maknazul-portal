const cfg = require('./config');
const { fmt } = require('./grading');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = s => String(s).replace(/\//g, '-');

function layout(title, body, user, flash) {
  const nav = user
    ? `<nav>${user.role === 'admin'
        ? '<a href="/admin">Students</a><a href="/admin/password">Password</a>'
        : `<a href="/profile/${user.id}">My Results</a>`}<a href="/logout">Logout (${esc(user.record.username || user.record.regNo)})</a></nav>`
    : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | ${esc(cfg.school.name)}</title>
<meta name="theme-color" content="#0b3d91"><link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="MIA Results"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="icon" href="/icons/icon-192.png"><link rel="stylesheet" href="/css/style.css"></head><body>
<header class="top"><img src="/logo.jpg" alt="logo"><div class="brand">${esc(cfg.school.name)}<small>RESULT PORTAL · ${esc(cfg.school.motto)}</small></div>${nav}</header>
<main>${flash ? `<div class="msg ${flash.err ? 'err' : ''}">${esc(flash.text)}</div>` : ''}${body}</main>
<footer>&copy; ${new Date().getFullYear()} ${esc(cfg.school.name)} &middot; Est. ${esc(cfg.school.est)}<br><button id="installBtn" class="sm" style="display:none;margin-top:8px">Install app</button><span id="iosHint" style="display:none">To install: tap Share, then &ldquo;Add to Home Screen&rdquo;.</span></footer>\n<script src="/pwa.js"></script></body></html>`;
}

function loginPage(flash) {
  return layout('Login', `<div class="card login"><h1>Portal Login</h1>
<form method="post" action="/login">
<div class="tabs"><label><input type="radio" name="role" value="student" checked><span>Student</span></label>
<label><input type="radio" name="role" value="admin"><span>Admin / Staff</span></label></div>
<label>Registration No. / Username</label><input name="username" required autofocus>
<label>PIN / Password</label><input name="password" type="password" required>
<p><button>Sign in</button></p></form></div>`, null, flash);
}

function courseTable(courses) {
  return `<div class="tablewrap"><table><tr><th>Code</th><th>Course Title</th><th>Unit</th><th>Status</th><th>Score</th><th>Grade</th><th>GP</th><th>CP</th></tr>
${courses.map(c => `<tr><td><b>${esc(c.code)}</b></td><td>${esc(c.title || '')}</td><td>${c.unit}</td><td>${esc(c.status)}</td><td>${c.score}</td><td>${c.grade}</td><td>${c.gp}</td><td>${c.cp}</td></tr>`).join('')}
</table></div>`;
}

function profilePage(p, user, flash) {
  const s = p.student;
  const base = `/profile/${s.id}`;
  const sessions = p.sessions.map(se => `<div class="card"><h2>${esc(se.session)} &mdash; ${esc(se.level)}</h2>
${se.semesters.map(sm => `<h3>${esc(sm.name)}</h3>${courseTable(sm.courses)}
<div class="sum">TNU: <b>${sm.tnu}</b> &nbsp; TCP: <b>${sm.tcp}</b> &nbsp; GPA: <b>${fmt(sm.gpa)}</b> &nbsp; CGPA: <b>${fmt(sm.cgpa)}</b>
&nbsp; <a class="btn sm alt" href="${base}/semester/${slug(se.session)}/${sm.sem}/pdf">Download PDF</a></div>`).join('')}
<div class="sum"><b>Session Summary:</b> CTNU: ${se.ctnu} &nbsp; CTCP: ${se.ctcp} &nbsp; CGPA: ${fmt(se.cgpa)} &nbsp; <span class="tag ${se.cgpa >= 1 ? 'ok' : 'bad'}">${se.standing}</span></div></div>`).join('');

  return layout(s.name, `<div class="card"><div class="actions" style="justify-content:space-between">
<div><h1>${esc(s.name)}</h1><div class="muted">${esc(s.regNo)} &middot; ${esc(s.discipline || '')} &middot; Entry: ${esc(s.yearOfEntry || '')} (${esc(s.modeOfEntry || '')})</div></div>
<div class="actions"><a class="btn" href="${base}/pdf">Download Full Result Profile (PDF)</a>${user.role === 'admin' ? `<a class="btn alt" href="/admin/student/${s.id}">Manage</a>` : ''}</div></div>
<div class="grid stats" style="margin-top:12px">
<div class="stat"><b>${fmt(p.cgpa)}</b><span>CGPA</span></div>
<div class="stat"><b>${p.ctnu}</b><span>Units taken</span></div>
<div class="stat"><b>${p.ctcp}</b><span>Credit points</span></div>
<div class="stat"><b>${esc(p.classification)}</b><span>Classification</span></div>
<div class="stat"><b>${p.outstanding.length}</b><span>Outstanding courses</span></div>
<div class="stat"><b>${p.graduating ? 'Yes' : 'No'}</b><span>Cleared to graduate</span></div></div></div>
${sessions || '<div class="card">No results have been published yet.</div>'}`, user, flash);
}

function adminHome(students, q, flash, user) {
  return layout('Students', `<div class="card"><h1>Students</h1>
<form class="actions" method="get"><input name="q" placeholder="Search name or reg no." value="${esc(q)}" style="max-width:320px"><button>Search</button></form>
<div class="tablewrap" style="margin-top:10px"><table><tr><th>Reg No.</th><th>Name</th><th>Class/Programme</th><th>Status</th><th></th></tr>
${students.map(s => `<tr><td>${esc(s.regNo)}</td><td>${esc(s.name)}</td><td>${esc(s.discipline || '')}</td><td><span class="tag">${esc(s.status || 'Active')}</span></td>
<td class="actions"><a class="btn sm" href="/admin/student/${s.id}">Manage / Enter results</a> <a class="btn sm alt" href="/profile/${s.id}">View</a></td></tr>`).join('') || '<tr><td colspan="5">No students yet.</td></tr>'}
</table></div></div>
<div class="card"><h2>Register new student</h2><form method="post" action="/admin/students">
<div class="row"><div><label>Registration No.</label><input name="regNo" required></div>
<div><label>Full Name</label><input name="name" required></div>
<div><label>Initial PIN</label><input name="pin" required value="${Math.floor(1000 + Math.random() * 9000)}"></div></div>
<div class="row"><div><label>Class / Programme</label><input name="discipline"></div>
<div><label>Department / Section</label><input name="department"></div>
<div><label>Mode of Entry</label><input name="modeOfEntry" value="Admission"></div>
<div><label>Year of Entry</label><input name="yearOfEntry" placeholder="2024/2025"></div></div>
<p><button>Register student</button></p></form></div>
<div class="card"><h2>Backup &amp; restore</h2>
<p class="muted">Free hosts can erase saved data when they restart. Download a backup after entering results, and restore it here if data ever disappears.</p>
<p><a class="btn" href="/admin/backup">Download backup</a></p>
<form method="post" action="/admin/restore" onsubmit="return confirm('This replaces ALL current data. Continue?')">
<label>Choose a backup file</label><input type="file" accept=".json,application/json" onchange="var f=this.files[0];if(f){var r=new FileReader();r.onload=function(){document.getElementById('bk').value=r.result};r.readAsText(f)}">
<textarea id="bk" name="json" rows="3" placeholder="...or paste backup text here" required></textarea>
<p><button class="danger">Restore backup</button></p></form></div>`, user, flash);
}

function adminStudent(p, user, flash) {
  const s = p.student;
  const per = Object.entries(cfg.periods).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  const st = Object.entries(cfg.statuses).map(([k, v]) => `<option value="${k}">${k} - ${esc(v)}</option>`).join('');
  const lists = p.sessions.map(se => se.semesters.map(sm => `<h3>${esc(se.session)} &middot; ${esc(se.level)} &middot; ${esc(sm.name)}</h3>
<div class="tablewrap"><table><tr><th>Code</th><th>Title</th><th>Unit</th><th>Status</th><th>Score</th><th>Grade</th><th></th></tr>
${sm.courses.map(c => `<tr><td>${esc(c.code)}</td><td>${esc(c.title || '')}</td><td>${c.unit}</td><td>${esc(c.status)}</td><td>${c.score}</td><td>${c.grade}</td>
<td><form method="post" action="/admin/result/${c.id}/delete" onsubmit="return confirm('Delete this result?')"><button class="danger sm">Delete</button></form></td></tr>`).join('')}</table></div>`).join('')).join('');
  return layout('Manage ' + s.name, `<div class="card"><div class="actions" style="justify-content:space-between"><h1>${esc(s.name)} <span class="muted">${esc(s.regNo)}</span></h1>
<a class="btn" href="/profile/${s.id}">View result profile</a></div>
<form method="post" action="/admin/student/${s.id}/update"><div class="row">
<div><label>Full Name</label><input name="name" value="${esc(s.name)}" required></div>
<div><label>Class / Programme</label><input name="discipline" value="${esc(s.discipline)}"></div>
<div><label>Department / Section</label><input name="department" value="${esc(s.department)}"></div>
<div><label>Mode of Entry</label><input name="modeOfEntry" value="${esc(s.modeOfEntry)}"></div>
<div><label>Year of Entry</label><input name="yearOfEntry" value="${esc(s.yearOfEntry)}"></div>
<div><label>Status</label><select name="status">${['Active', 'Graduated', 'Deferred', 'Withdrawn'].map(x => `<option ${s.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
<div><label>Disciplinary Status</label><input name="disciplinary" value="${esc(s.disciplinary || 'NONE')}"></div>
<div><label>Reset PIN (leave blank to keep)</label><input name="pin"></div></div>
<p><button>Save details</button></p></form></div>

<div class="card"><h2>Add a single result</h2><form method="post" action="/admin/student/${s.id}/results">
<div class="row"><div><label>Session</label><input name="session" placeholder="2024/2025" required></div>
<div><label>Level / Class</label><input name="level" placeholder="100 Level / JSS 1" required></div>
<div><label>Term</label><select name="semester">${per}</select></div></div>
<div class="row"><div><label>Course Code</label><input name="code" required></div>
<div><label>Course Title</label><input name="title"></div>
<div><label>Unit</label><input name="unit" type="number" min="1" max="12" value="2" required></div>
<div><label>Status</label><select name="status">${st}</select></div>
<div><label>Score (0-100)</label><input name="score" type="number" min="0" max="100" step="0.5" required></div></div>
<p><button>Add result</button></p></form></div>

<div class="card"><h2>Bulk entry (paste lines)</h2><p class="muted">One course per line: <code>CODE, Title, Unit, Status, Score</code> &mdash; e.g. <code>ISS 101, Intro to Islamic Studies, 2, C, 68</code></p>
<form method="post" action="/admin/student/${s.id}/bulk"><div class="row">
<div><label>Session</label><input name="session" placeholder="2024/2025" required></div>
<div><label>Level / Class</label><input name="level" required></div>
<div><label>Term</label><select name="semester">${per}</select></div></div>
<label>Lines</label><textarea name="lines" rows="7" required></textarea>
<p><button>Import results</button></p></form></div>

<div class="card"><h2>Recorded results</h2>${lists || '<p class="muted">None yet.</p>'}</div>`, user, flash);
}

function passwordPage(user, flash) {
  return layout('Password', `<div class="card login"><h1>Change admin password</h1><form method="post" action="/admin/password">
<label>New password (min 6 chars)</label><input type="password" name="password" minlength="6" required><p><button>Update</button></p></form></div>`, user, flash);
}

module.exports = { layout, loginPage, profilePage, adminHome, adminStudent, passwordPage, esc, slug };
