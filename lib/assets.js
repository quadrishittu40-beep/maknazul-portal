// Writes public/logo.jpg and public/sig.jpg on startup if missing
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'public');
fs.mkdirSync(dir, { recursive: true });
[['logo.jpg', './logo'], ['sig.jpg', './sig']].forEach(([name, mod]) => {
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) fs.writeFileSync(file, Buffer.from(require(mod), 'base64'));
});
