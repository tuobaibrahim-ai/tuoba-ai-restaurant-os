// ============================================================================
// TUOBA ERP — password hashing (scrypt) + token helpers. Zero dependencies.
// ============================================================================
const crypto = require('node:crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  try {
    const hash = crypto.scryptSync(String(password), salt, 64);
    const expected = Buffer.from(expectedHash, 'hex');
    return hash.length === expected.length && crypto.timingSafeEqual(hash, expected);
  } catch {
    return false;
  }
}

function newSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

module.exports = { hashPassword, verifyPassword, newSessionToken, tokenHash };
