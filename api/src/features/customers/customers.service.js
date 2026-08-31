import { randomUUID } from 'node:crypto';

import { HttpError, unprocessable } from '../../platform/http/errors.js';
import { MAX_LIMIT } from '../../platform/http/pagination.js';
import { createAuditWriter, transact } from '../audit/index.js';
import {
  normaliseCustomer,
  normaliseNote,
  phoneDigits,
  validateCustomer,
  validateNote,
  validateResolveInput,
} from './customers.rules.js';
import {
  countCustomerNotes,
  countLiveCustomers,
  countSearchLiveCustomers,
  findCustomerById,
  findLiveCustomerByEmail,
  updateCustomerContacts,
  findLiveCustomerById,
  insertCustomer,
  insertCustomerNote,
  setCustomerUserId,
  listCustomerNotes,
  listLiveCustomers,
  searchLiveCustomers,
} from './customers.repository.js';

// What a customer looks like to anyone outside this feature. deleted_at is not
// a field here: a caller never sees one, because a deleted customer is never
// returned.
// The fields a correction may touch — the contact details, and nothing that
// belongs to another story: not the sign-in link (CUSTOMERS-6-API's), and not
// `address`, which no route has ever written and PROJECTION does not return.
const CORRECTABLE = ['name', 'email', 'phone'];

const publicShape = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  // Whether they can sign in, not which account it is. A screen needs to know
  // that a grant has happened so it can say so instead of offering an action
  // that will be refused; the user's id is identity's to hand out.
  hasSignIn: row.user_id !== null && row.user_id !== undefined,
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

export function createCustomersService({ db, tickets, identity, now = () => Math.floor(Date.now() / 1000) }) {
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

    // Correcting a customer's contact details.
    //
    // The whole customer is validated, not the fields that arrived. The rule
    // that a customer needs a name is a rule about a CUSTOMER, and checking
    // only what was sent would let a correction that clears the name pass
    // because the name was not the field being corrected. So the patch is
    // merged onto the stored row and the result is checked — which also means
    // one validator serves creation and correction, and cannot disagree with
    // itself.
    //
    // No revision. BR-5 names the writes it covers and this is not one of
    // them (CUSTOMERS-7-API's criteria say so); adding one here would be a
    // rule this story invented for itself.
    update(actor, { id, patch }) {
      const sent = CORRECTABLE.filter((field) =>
        Object.prototype.hasOwnProperty.call(patch ?? {}, field));
      // Nothing to do is refused rather than answered 200. A caller that sent
      // no field meant to send one, and a silent success hides the mistake
      // until somebody notices the correction never happened.
      if (sent.length === 0) throw unprocessable(['changes']);

      const at = stamp();

      return transact(db, () => {
        const row = findLiveCustomerById(db, { id });
        // Reading a deleted customer is allowed — their tickets and notes did
        // not stop existing. Correcting one is not: there is nobody to
        // correct, and the answer is the one a missing customer gets.
        if (!row) throw new HttpError(404, 'NOT_FOUND');

        const held = { name: row.name, email: row.email, phone: row.phone };
        const merged = { ...held };
        for (const field of sent) merged[field] = patch[field];

        const invalid = validateCustomer(merged);
        if (invalid.length > 0) throw unprocessable(invalid);

        const wanted = normaliseCustomer(merged);
        // What actually moves. A diff listing every field as changed is a diff
        // nobody can read, and the fields nobody sent must not appear in it
        // even when the caller sent a value equal to the stored one.
        const changes = {};
        for (const field of sent) {
          if (wanted[field] !== held[field]) changes[field] = wanted[field];
        }
        if (Object.keys(changes).length === 0) throw unprocessable(sent);

        // Checked here rather than left to the unique index, for the reason
        // create records: an index that fires is a 500 telling the caller
        // their typo was our fault. Their own address is not a conflict with
        // themselves.
        if (changes.email !== undefined) {
          const holder = findLiveCustomerByEmail(db, { email: changes.email });
          if (holder && holder.id !== id) throw unprocessable(['email']);
        }

        const written = updateCustomerContacts(db, { id, changes, at });

        audit.record(actor, {
          entity: 'customer',
          entityId: id,
          verb: 'customer.update',
          // Both sides carry the same keys, and only the ones that moved —
          // so the trail reads as "email: this to that" rather than as a
          // record of everything the customer happens to have.
          before: Object.fromEntries(Object.keys(changes).map((f) => [f, held[f]])),
          after: changes,
          at,
        });

        return publicShape(written);
      });
    },

    // An agent gives a customer a way in. I-1's link, written.
    //
    // One transaction covering both writes, which is why identity's makeUser
    // takes no transaction of its own: a user row without the link is an
    // account belonging to nobody, and the link without the row is a foreign
    // key pointing at nothing. Either alone is worse than neither.
    grantSignIn(actor, { customerId }) {
      const customer = liveCustomerOr404(customerId);

      // I-4: the address IS the credential. A customer with none has nothing
      // to sign in with, and inventing one for them would be inventing an
      // identity.
      if (!customer.email) throw unprocessable(['email']);

      // Not a second account for one person. The partial unique index on
      // user_id would refuse it too, and CRM-82's lesson is that an index
      // firing gives a raw SQLite error and a 500 — which tells the caller
      // their reasonable question was our fault.
      if (customer.user_id) throw new HttpError(409, 'CONFLICT');

      return transact(db, () => {
        const at = stamp();
        // The role is supplied here and never taken from a request: the
        // accounts routes cannot mint a `customer`, because a customer user
        // with no customer behind it is an account that owns nothing and would
        // be refused from its own tickets.
        const made = identity.makeUser(actor, {
          email: customer.email,
          name: customer.name,
          role: 'customer',
        });

        setCustomerUserId(db, { customerId, userId: made.user.id, at });

        audit.record(actor, {
          entity: 'customer',
          entityId: customerId,
          verb: 'customer.grant_sign_in',
          before: { userId: null },
          // The id of the account, and nothing about how to get into it. The
          // audit guarantee test asserts no diff in this API carries a
          // password or a hash.
          after: { userId: made.user.id },
          at,
        });

        // The password travels once, in this answer, and is never stored in a
        // form anything can read back — the same contract creating a staff
        // account has. The agent is on the phone and reads it out.
        return { customer: publicShape(findCustomerById(db, { id: customerId })), ...made };
      });
    },

    // Identity resolution — I-2 and I-4. A service method with no route: the
    // only caller is CHANNELS-1-API (CRM-118), which is a public intake.
    //
    // The address identifies. A request that carries none cannot be attributed
    // to anybody and is refused naming the field. Two spellings of one address
    // are one person, and the folding is customers.email COLLATE NOCASE
    // (0001__customers.sql:4) — a LOWER() here would both restate that and put
    // the index out of reach.
    //
    // A hit is a read: no insert, no audit row, and the stored name is left
    // exactly as it was. Somebody typing a name into a public form must not be
    // able to rename a customer already on file.
    //
    // A miss creates one then and there, which is what I-2 asks for. The actor
    // travels through as it arrives and is null from a public intake, so
    // audit.record writes actorId = null — the system, never a borrowed staff
    // id (BR-2). The unique index is partial and scoped to live rows
    // (0001__customers.sql:14-16), so an address held only by a soft-deleted
    // customer resolves to a NEW row rather than reviving the removed one:
    // BR-1 keeps that row for the trail, not for writing to.
    //
    // CALLER, NOTE: this opens its own transaction, and SQLite refuses a
    // transaction inside a transaction. An intake that wanted to resolve and
    // raise a ticket as one atomic act cannot wrap both calls — validate the
    // ticket's fields first, then resolve, then raise. A customer who arrived
    // is a fact even when the ticket they were trying to raise is refused.
    resolveByEmail(actor, input) {
      const invalid = validateResolveInput(input ?? {});
      if (invalid.length > 0) throw unprocessable(invalid);

      // normaliseCustomer collapses a blank to null and trims the rest, which
      // is the same treatment `create` gives. phone is not part of resolution:
      // an address is the key, and a number arriving on a public form is not
      // one this method is asked to trust.
      const { name, email } = normaliseCustomer({
        name: input.name ?? '',
        email: input.email,
        phone: null,
      });

      return transact(db, () => {
        const hit = findLiveCustomerByEmail(db, { email });
        // findLiveCustomerByEmail answers with an id and nothing else, so the
        // row is re-read to return the same shape the miss branch does.
        if (hit) return publicShape(findCustomerById(db, { id: hit.id }));

        // The column is NOT NULL and a public form may have collected no name.
        // The address stands in for it, which reads on a list as "we know how
        // to reach them and not what to call them" — visibly incomplete rather
        // than quietly wrong, which a placeholder like "Unknown" would be.
        const chosen = name === null || name === '' ? email : name;
        const id = randomUUID();
        const at = stamp();
        const created = insertCustomer(db, { id, name: chosen, email, phone: null, at });

        // The same verb `create` writes. A second verb for one event would
        // make the trail's reader ask what the difference is, and the answer —
        // who did it — is already in actor_id.
        audit.record(actor, {
          entity: 'customer',
          entityId: id,
          verb: 'customer.create',
          before: null,
          after: { name: chosen, email, phone: null },
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
    // Everything one screen needs about one customer, in one answer.
    //
    // One request rather than three, and the three reads share a transaction:
    // a screen that assembles this from separate calls shows three different
    // moments as if they were one. A read, so it writes no audit row.
    //
    // The tickets come from the tickets feature through the service injected
    // at composition — the customers feature never learns the tickets table.
    read(actor, { id, limit, offset }) {
      return transact(db, () => {
        const row = findCustomerById(db, { id });
        if (!row) throw new HttpError(404, 'NOT_FOUND');

        // Notes come back whole, capped at the same ceiling every list obeys
        // and carrying their total — so a customer with more notes than that
        // is visible as such rather than silently truncated. BR-4 is about
        // lists that grow without bound; per-customer notes are bounded by
        // human use, and this screen wants them together.
        const notes = listCustomerNotes(db, { customerId: id, limit: MAX_LIMIT, offset: 0 });

        return {
          customer: publicShape(row),
          tickets: tickets.openForCustomer(actor, { customerId: id, limit, offset }),
          notes: { items: notes.map(noteShape), total: countCustomerNotes(db, { customerId: id }) },
        };
      });
    },

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
