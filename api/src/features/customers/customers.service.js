import { phoneDigits } from './customers.rules.js';
import {
  countLiveCustomers,
  countSearchLiveCustomers,
  listLiveCustomers,
  searchLiveCustomers,
} from './customers.repository.js';

// What a customer looks like to anyone outside this feature. deleted_at is not
// a field here: a caller never sees one, because a deleted customer is never
// returned.
const publicShape = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  createdAt: row.created_at ?? null,
  updatedAt: row.updated_at ?? null,
});

export function createCustomersService({ db }) {
  return {
    // One search, not three parameters. A term that matches nothing is an
    // empty page with a total of zero, never a 404 — nothing was missing, and
    // nothing matched. No term at all is the customers themselves.
    //
    // A read is not a mutation, so it writes no audit row.
    search(actor, { term, limit, offset }) {
      const trimmed = String(term ?? '').trim();

      if (trimmed === '') {
        return {
          items: listLiveCustomers(db, { limit, offset }).map(publicShape),
          total: countLiveCustomers(db),
          limit,
          offset,
        };
      }

      const query = { term: trimmed, digits: phoneDigits(trimmed) };
      return {
        // total counts the matches, not the page.
        items: searchLiveCustomers(db, { ...query, limit, offset }).map(publicShape),
        total: countSearchLiveCustomers(db, query),
        limit,
        offset,
      };
    },
  };
}
