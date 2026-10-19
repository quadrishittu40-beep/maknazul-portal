// Writes public/logo.jpg, public/sig.jpg and public/icons/* on startup if missing
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'public');
fs.mkdirSync(path.join(dir, 'icons'), { recursive: true });
[['logo.jpg', './logo'], ['sig.jpg', './sig']].forEach(([name, mod]) => {
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) fs.writeFileSync(file, Buffer.from(require(mod), 'base64'));
});
const icons = require('./icons');
Object.keys(icons).forEach(name => {
  const file = path.join(dir, 'icons', name);
  if (!fs.existsSync(file)) fs.writeFileSync(file, Buffer.from(icons[name], 'base64'));
});
