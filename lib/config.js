// ---- Edit this file to customise the portal ----
module.exports = {
  timezone: 'Africa/Lagos', tzLabel: 'WAT', // used for the download date/time on PDFs
  port: process.env.PORT || 3000,

  school: {
    name: "MAKNAZUL 'IRFAN ACADEMY",
    motto: 'KNOWLEDGE · FAITH · EXCELLENCE',
    est: '2024',
    address: '' // e.g. 'Ojo, Lagos State'
  },

  // Names for the periods in a session. Terms in a session.
  periods: { 1: 'First Term', 2: 'Second Term', 3: 'Third Term' },

  // Pass mark and 5-point grading scale (score -> grade -> grade point)
  passMark: 30,
  scale: [
    { min: 70, grade: 'A', gp: 5 },
    { min: 60, grade: 'B', gp: 4 },
    { min: 50, grade: 'C', gp: 3 },
    { min: 40, grade: 'D', gp: 2 },
    { min: 30, grade: 'E', gp: 1 },
    { min: 0, grade: 'F', gp: 0 }
  ],

  // Course status codes shown in the result sheet
  statuses: { C: 'Core', E: 'Elective', R: 'Required' },

  // Total credit units a student must earn before graduating
  unitsToGraduate: 70,

  // Default admin (created on first start). CHANGE THE PASSWORD after first login!
  defaultAdmin: {
    username: process.env.ADMIN_USER || 'admin',
    password: process.env.ADMIN_PASS || 'admin123'
  }
};
