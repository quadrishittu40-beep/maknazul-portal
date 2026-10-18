// Optional: adds a DEMO student so you can see the portal working.  Run:  npm run seed
const bcrypt = require('./lib/hash');
require('./lib/assets');
const db = require('./lib/db');
db.load();
const store = db.get();

if (store.students.some(s => s.regNo === 'MIA/24/001')) {
  console.log('Demo student already exists.');
  process.exit(0);
}
const sid = db.nextId();
store.students.push({
  id: sid, regNo: 'MIA/24/001', name: 'DEMO STUDENT ONE', pinHash: bcrypt.hashSync('1234', 10),
  discipline: 'Islamic Studies', department: 'Arabic & Islamic Sciences', modeOfEntry: 'Admission',
  yearOfEntry: '2024/2025', status: 'Active', disciplinary: 'NONE'
});

const data = {
  '2024/2025|Level 1': {
    1: [['ISS 101', 'Intro to Islamic Studies', 2, 'C', 72], ['ARA 111', 'Arabic Grammar I', 3, 'C', 65], ['QUR 101', 'Quran Recitation I', 2, 'C', 81], ['ENG 101', 'English Language', 2, 'E', 58]],
    2: [['ISS 102', 'Fiqh Basics', 2, 'C', 66], ['ARA 112', 'Arabic Grammar II', 3, 'C', 49], ['QUR 102', 'Quran Recitation II', 2, 'C', 75], ['ENG 102', 'Literature', 2, 'E', 38]]
  },
  '2025/2026|Level 2': {
    1: [['ISS 201', 'Hadith Studies I', 3, 'C', 70], ['ARA 211', 'Arabic Rhetoric', 2, 'C', 61], ['QUR 201', 'Tajweed', 2, 'C', 88]]
  }
};
for (const [key, sems] of Object.entries(data)) {
  const [session, level] = key.split('|');
  for (const [sem, list] of Object.entries(sems))
    for (const [code, title, unit, status, score] of list)
      store.results.push({ id: db.nextId(), studentId: sid, session, level, semester: Number(sem), code, title, unit, status, score });
}
db.save();
console.log('Demo student added -> Reg No: MIA/24/001   PIN: 1234');
