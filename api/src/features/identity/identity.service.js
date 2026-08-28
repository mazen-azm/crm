import { HttpError, unprocessable } from '../../platform/http/errors.js';
import { verifyPassword, DUMMY_PASSWORD_HASH } from '../../shared/password.js';
import { findLiveUserByEmail } from './identity.repository.js';
import {
  TOKEN_TTL_SECONDS,
  normaliseEmail,
  signToken,
  validateCredentials,
} from './identity.rules.js';

export function createIdentityService({ db, secret, now = () => Math.floor(Date.now() / 1000) }) {
  return {
    signIn({ email, password }) {
      // The shape of the request and the truth of the credential are separate
      // questions, asked in that order. A malformed body is 422 naming the
      // fields; only a well-formed one can be wrong.
      const invalid = validateCredentials({ email, password });
      if (invalid.length > 0) throw unprocessable(invalid);

      const row = findLiveUserByEmail(db, normaliseEmail(email));

      // When no account matched we still hash the candidate, against a dummy.
      // DO NOT DELETE: without it the unknown-email path returns faster than
      // the wrong-password path, and the difference is a way to find out who
      // works here.
      const correct = verifyPassword(password, row ? row.password_hash : DUMMY_PASSWORD_HASH);

      // One answer for a wrong password, an unknown address, and a
      // soft-deleted account. A response that told them apart would be a
      // directory of the staff.
      if (!row || !correct) throw new HttpError(401, 'UNAUTHENTICATED');

      return {
        token: signToken(
          { sub: row.id, role: row.role, exp: now() + TOKEN_TTL_SECONDS },
          secret,
        ),
        user: { id: row.id, role: row.role, name: row.name },
      };
    },
  };
}
