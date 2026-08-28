import { createHmac, timingSafeEqual } from 'node:crypto';

// The pure part of identity: no database, no request, no response. Everything
// here is a function of its arguments, which is what makes it testable without
// a server and reviewable without a debugger.

// Eight hours is the whole session. There is no refresh token: a story that
// needs one can argue for it, and inventing half of that mechanism now would
// leave a seam nobody owns.
export const TOKEN_TTL_SECONDS = 60 * 60 * 8;

// The token is payload.signature, both base64url, signed with HMAC-SHA256.
//
// The algorithm is fixed in the code and named nowhere in the token. A JWT
// carries its algorithm in a header the attacker controls, which is how
// alg:none happened; a token that cannot say how it was signed cannot lie
// about it.
const ALGORITHM = 'sha256';

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const sign = (encodedPayload, secret) =>
  createHmac(ALGORITHM, secret).update(encodedPayload).digest('base64url');

export function signToken({ sub, role, exp }, secret) {
  const payload = encode({ sub, role, exp });
  return `${payload}.${sign(payload, secret)}`;
}

// Returns the payload, or null. Null for every reason — wrong shape, wrong
// signature, expired, unparseable — because a caller that could tell them
// apart would tell an attacker too.
export function verifyToken(raw, secret, { now = () => Math.floor(Date.now() / 1000) } = {}) {
  if (typeof raw !== 'string') return null;
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(signature);
  // timingSafeEqual throws on a length mismatch, and the lengths differ only
  // when the signature is the wrong shape, which is already a refusal.
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  let claims;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!claims || typeof claims.sub !== 'string' || typeof claims.exp !== 'number') return null;
  if (claims.exp <= now()) return null;
  return claims;
}

// A credential the API can act on has a shape before it has a truth. The
// field names are all a refusal may carry — a value could be the password.
export function validateCredentials({ email, password }) {
  const missing = [];
  if (typeof email !== 'string' || !email.includes('@') || email.length > 254) missing.push('email');
  if (typeof password !== 'string' || password.length === 0) missing.push('password');
  return missing;
}

export const normaliseEmail = (email) => email.trim().toLowerCase();
