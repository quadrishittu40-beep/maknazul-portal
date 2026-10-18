// Tiny JSON-file database (pure JavaScript - no native modules, works on Spck)
const fs = require('fs');
const path = require('path');

// On a host with a persistent disk, set DATA_DIR to its mount path (e.g. /var/data)
const DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DIR, 'db.json');
let db;

function load() {
  fs.mkdirSync(DIR, { recursive: true });
  if (fs.existsSync(FILE)) {
    db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } else {
    db = { seq: 1, admins: [], students: [], results: [] };
    save();
  }
  return db;
}

function save() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, FILE);
}

const get = () => db || load();
const nextId = () => get().seq++;

module.exports = { load, save, get, nextId, DIR };
