// Writes public/logo.jpg on startup if it is missing
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'public', 'logo.jpg');
if (!fs.existsSync(file)) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(require('./logo'), 'base64'));
}
