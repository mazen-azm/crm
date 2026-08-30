import { findCustomerIdByUserId, findLiveUserById } from './identity.repository.js';
import { verifyToken } from './identity.rules.js';

const BEARER = /^Bearer ([A-Za-z0-9._-]+)$/;

// The real resolver for the seam PLATFORM-4-API built. It answers with a
// subject or with null, and never throws: attachSubject turns a throw into a
// 500, and a bad token is a 401 the guard decides — not a server error.
export function identitySubjectResolver({ db, secret, now }) {
  return async (req) => {
    try {
      const header = req.get?.('Authorization') ?? req.headers?.authorization;
      const match = typeof header === 'string' ? header.match(BEARER) : null;
      if (!match) return null;

      const claims = verifyToken(match[1], secret, now ? { now } : {});
      if (!claims) return null;

      // A token outlives the account it was issued for. Someone disabled
      // this morning must not still be signed in this afternoon.
      const row = findLiveUserById(db, claims.sub);
      if (!row) return null;

      // Which customer this is, for the role that has one. The ticket
      // ownership check compares against it, so it has to be on the subject
      // rather than looked up inside a service that would then be reading
      // another feature's table for identity's answer.
      //
      // Resolved per request rather than carried in the token: the link can be
      // written after a token was issued, and a token that claimed a customer
      // id would keep claiming it after the customer was removed.
      //
      // Undefined when there is no link — a `customer` user with no customer
      // behind them, which nothing can create today. The comparison then fails
      // against every ticket, which is the safe direction.
      if (row.role !== 'customer') return { id: row.id, role: row.role, name: row.name };
      return {
        id: row.id,
        role: row.role,
        name: row.name,
        customerId: findCustomerIdByUserId(db, row.id) ?? undefined,
      };
    } catch {
      // An unreadable header or an unavailable row is not a subject. The
      // guard answers 401, which is the truth: we could not establish who
      // this is.
      return null;
    }
  };
}
