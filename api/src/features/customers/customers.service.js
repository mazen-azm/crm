import { randomUUID } from 'node:crypto';

import { HttpError, unprocessable } from '../../platform/http/errors.js';
import { createAuditWriter, transact } from '../audit/index.js';
import { normaliseCustomer, normaliseNote, phoneDigits, validateCustomer, validateNote } from './customers.rules.js';
import {
  countCustomerNotes,
  countLiveCustomers,
  countSearchLiveCustomers,
  findLiveCustomerByEmail,
  findLiveCustomerById,
  insertCustomer,
  insertCustomerNote,
  listCustomerNotes,
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

const noteShape = (row) => ({
  id: row.id,
  customerId: row.customer_id,
  authorId: row.author_id,
  body: row.body,
  createdAt: row.created_at,
});

export function createCustomersService({ db, now = () => Math.floor(Date.now() / 1000) }) {
  const stamp = () => new Date(now() * 1000).toISOString();
  const audit = createAuditWriter({ db });

  // A customer who was soft-deleted is a customer who has been removed. BR-1
  // keeps their row for the audit trail, not for writing to.
  const liveCustomerOr404 = (id) => {
    const row = findLiveCustomerById(db, { id });
    if (!row) throw new HttpError(404, 'NOT_FOUND');
    return row;
  };

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

    // The shape check first, so a blank note never reaches the transaction and
    // a 422 names the field rather than the value.
    // Somebody on the telephone, put on file while they are still talking.
    create(actor, input) {
      const invalid = validateCustomer(input ?? {});
      if (invalid.length > 0) throw unprocessable(invalid);

      const { name, email, phone } = normaliseCustomer(input);
      const id = randomUUID();
      const at = stamp();

      return transact(db, () => {
        // Checked here rather than left to the unique index, for the reason
        // CRM-82 found the hard way: an index that fires produces a raw SQLite
        // error, which escapes as a 500 and tells the caller their typo was
        // our fault. The index stays as the second guard.
        if (findLiveCustomerByEmail(db, { email })) {
          throw unprocessable(['email']);
        }

        // One row, in one table. I-1 says users and customers are two things,
        // and this route creates a customer — a test asserts the users count
        // does not move.
        const created = insertCustomer(db, { id, name, email, phone, at });

        audit.record(actor, {
          entity: 'customer',
          entityId: id,
          verb: 'customer.create',
          before: null,
          after: { name, email, phone },
          at,
        });

        return publicShape(created);
      });
    },

    writeNote(actor, { customerId, body }) {
      const invalid = validateNote({ body });
      if (invalid.length > 0) throw unprocessable(invalid);

      const text = normaliseNote(body);
      const id = randomUUID();
      const at = stamp();

      // The insert MUST stay inside transact. Outside it, the audit guard
      // refuses the commit and the note vanishes — which is BR-2 doing its job
      // rather than a bug. Do not hoist it out to "simplify" this.
      return transact(db, () => {
        liveCustomerOr404(customerId);
        insertCustomerNote(db, { id, customerId, authorId: actor?.id ?? null, body: text, createdAt: at });
        audit.record(actor, {
          entity: 'customer_note',
          entityId: id,
          verb: 'customer_note.create',
          before: null,
          after: { customerId, body: text },
          at,
        });
        return { id, customerId, authorId: actor?.id ?? null, body: text, createdAt: at };
      });
    },

    // A read is not a mutation, so it writes no audit row.
    //
    // "Internal" is a rule about the customer portal, which does not exist.
    // Nothing here filters for visibility because there is nothing yet to
    // filter against — and a flag invented for an absent consumer is the kind
    // of machinery that later gets mistaken for a requirement.
    listNotes(actor, { customerId, limit, offset }) {
      liveCustomerOr404(customerId);
      return {
        items: listCustomerNotes(db, { customerId, limit, offset }).map(noteShape),
        total: countCustomerNotes(db, { customerId }),
        limit,
        offset,
      };
    },
  };
}
