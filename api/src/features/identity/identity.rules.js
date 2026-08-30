import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

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
// The one rule about what a password may be. Length, and nothing else: a
// composition rule that demands a symbol produces the same password with a
// symbol on the end, and twelve characters is worth more than four classes of
// character in eight.
//
// It applies where a password is CHOSEN, not where one is presented. signIn
// checks only that a password is non-empty, and must keep doing so: a floor
// there would refuse an account whose password predates the floor, and would
// tell whoever typed it something about the stored value.
export const MIN_PASSWORD_LENGTH = 12;

export function validateNewPassword({ password }) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) return ['password'];
  return [];
}

export function validateCredentials({ email, password }) {
  const missing = [];
  if (typeof email !== 'string' || !email.includes('@') || email.length > 254) missing.push('email');
  if (typeof password !== 'string' || password.length === 0) missing.push('password');
  return missing;
}

export const normaliseEmail = (email) => email.trim().toLowerCase();

// Three roles, named once. Each was a decision rather than a string.
//
// `customer` is not a smaller agent. It carries no permission an agent has: a
// customer reaches their own ticket and nothing else, which requireStaff() in
// platform/http/permission.js enforces on every route that is not deliberately
// customer-facing, and a census test reads that off the router.
export const ROLES = Object.freeze(['admin', 'agent', 'customer']);
export const isRole = (value) => ROLES.includes(value);

// The roles an admin may hand out through the accounts routes. A customer's
// account is not created there — it is granted against a customer record by
// CUSTOMERS-6-API, which is the only thing that can also write the link that
// makes the role mean anything. Creating a bare `customer` user with no
// customer behind it would be an account that owns nothing and can reach
// nothing, and the ownership check would 404 them out of their own tickets.
export const STAFF_ROLES = Object.freeze(['admin', 'agent']);
export const isStaffRole = (value) => STAFF_ROLES.includes(value);

export function validateNewAccount({ email, name, role }) {
  const wrong = [];
  if (typeof email !== 'string' || !email.includes('@') || email.length > 254) wrong.push('email');
  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 200) wrong.push('name');
  // isStaffRole, not isRole: `customer` is a real role and is not one an admin
  // hands out here. It is granted against a customer record, by the one route
  // that can also write the link the role depends on.
  if (!isStaffRole(role)) wrong.push('role');
  return wrong;
}

export function validateRoleChange({ role }) {
  // Same reasoning: an admin may move somebody between admin and agent, and
  // may not turn a staff account into a customer. That is not a role change,
  // it is a different person.
  return isStaffRole(role) ? [] : ['role'];
}

// Returned once in the create response and never stored in plaintext. The
// admin hands it over and the person changes it; IDENTITY-6-API replaces this
// with a proper set-password flow.
export function generateInitialPassword() {
  return randomBytes(18).toString('base64url');
}
