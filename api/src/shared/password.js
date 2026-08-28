import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// One definition of how a password is stored, used by everything that stores
// or checks one. The seed writes rows and the identity feature reads them; two
// implementations of the same format would agree until the day one of them was
// tuned, and then nobody could sign in.
//
// scrypt from node:crypto — no bcrypt, no argon2, no dependency. The salt is
// stored beside the hash because a hash without its salt cannot be checked.
// shared/ knows no feature, which is why this can live here.
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export function hashPassword(plaintext) {
  const salt = randomBytes(SALT_LENGTH);
  return `${salt.toString('hex')}:${scryptSync(plaintext, salt, KEY_LENGTH).toString('hex')}`;
}

// Never throws. A row whose hash is malformed is a failed sign-in, not a 500:
// the caller gets the same answer as a wrong password, which is the answer
// that reveals least.
export function verifyPassword(plaintext, stored) {
  if (typeof plaintext !== 'string' || typeof stored !== 'string') return false;
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  try {
    const expected = Buffer.from(hashHex, 'hex');
    if (expected.length !== KEY_LENGTH) return false;
    const actual = scryptSync(plaintext, Buffer.from(saltHex, 'hex'), KEY_LENGTH);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// The target of the comparison performed when no account matched. Hashing a
// candidate against this makes the unknown-email path cost the same as the
// wrong-password path, so the response time cannot be used to learn which
// addresses exist. It looks like pointless work; it is the point.
export const DUMMY_PASSWORD_HASH = hashPassword('a password nobody has, used only for timing');
