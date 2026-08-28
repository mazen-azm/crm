import { randomUUID } from 'node:crypto';

import { insertAuditEvent } from './audit.repository.js';

// BR-2 is global, so its writer cannot belong to whichever feature happened to
// need it first. It lived in identity until this story; the next feature to
// mutate anything would have had to import from identity or write its own.
export function createAuditWriter({ db }) {
  return {
    record(actor, { entity, entityId, verb, before, after, at }) {
      return insertAuditEvent(db, {
        id: randomUUID(),
        // The system is null, never invented. A row claiming a person did
        // something the system did is worse than a row admitting nobody did.
        actorId: actor?.id ?? null,
        entity,
        entityId,
        verb,
        at,
        // SQLite has no JSON column type, so the diff is serialised here. It
        // carries field names and their values from THIS feature's callers —
        // never a password, a hash or a token. The guarantee test asserts it.
        diff: JSON.stringify({ before, after }),
      });
    },
  };
}

// The frame identity's four mutations already use, lifted so the next feature
// does not reinvent it. The change and its audit row commit together or roll
// back together; there is no arrangement in which one survives the other.
export function transact(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (failure) {
    db.exec('ROLLBACK');
    throw failure;
  }
}
