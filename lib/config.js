// ---- Edit this file to customise the portal ----
module.exports = {
  port: process.env.PORT || 3000,

  school: {
    name: "MAKNAZUL 'IRFAN ACADEMY",
    motto: 'KNOWLEDGE · FAITH · EXCELLENCE',
    est: '2024',
    address: '' // e.g. 'Ojo, Lagos State'
  },

  // Names for the periods in a session. Change "Semester" to "Term" if you prefer.
  periods: { 1: 'First Semester', 2: 'Second Semester', 3: 'Third Semester' },

  // Pass mark and 5-point grading scale (score -> grade -> grade point)
  passMark: 40,
  scale: [
    { min: 70, grade: 'A', gp: 5 },
    { min: 60, grade: 'B', gp: 4 },
    { min: 50, grade: 'C', gp: 3 },
    { min: 45, grade: 'D', gp: 2 },
    { min: 40, grade: 'E', gp: 1 },
    { min: 0, grade: 'F', gp: 0 }
  ],

  // Course status codes shown in the result sheet
  statuses: { C: 'Core', E: 'Elective', R: 'Required' },

  // Total credit units a student must earn before graduating
  unitsToGraduate: 120,

  // Default admin (created on first start). CHANGE THE PASSWORD after first login!
  defaultAdmin: {
    username: process.env.ADMIN_USER || 'admin',
    password: process.env.ADMIN_PASS || 'admin123'
  }
};
