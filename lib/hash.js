// Password hashing with Node's built-in scrypt (replaces bcryptjs)
const crypto = require('crypto');

const hashSync = pw => {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(String(pw), salt, 32).toString('hex');
};

const compareSync = (pw, stored) => {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex'), b = crypto.scryptSync(String(pw), salt, 32);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

module.exports = { hashSync, compareSync };
