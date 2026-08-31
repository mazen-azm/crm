import { unprocessable } from '../../platform/http/errors.js';
import { countTrail, listTrail, SYSTEM_ACTOR } from './audit.repository.js';

// An ISO-8601 instant, which is what every stamp in this database is. Checked
// by parsing rather than by a regexp: the point is that SQLite will compare it
// as a string against the stored ones, so anything that does not sort the same
// way they do is not a bound, it is a bug waiting for a date.
const isInstant = (value) =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value)) && value.includes('T');

// Reading the trail, filtered.
//
// A reader and not a writer: this feature's service is the writer every other
// feature holds, and putting a query beside `record` would let a caller reach
// one while meaning the other.
export function createTrailReader({ db }) {
  return {
    read(_actor, { actorId, entity, entityId, from, to, limit, offset }) {
      const invalid = [];
      // Present-but-empty is a mistake, not a filter: a screen that sends
      // `?actorId=` has lost its value somewhere, and answering with the whole
      // trail hides that from whoever is looking at it.
      for (const [name, value] of [['actorId', actorId], ['entity', entity], ['entityId', entityId]]) {
        if (value !== undefined && (typeof value !== 'string' || value === '')) invalid.push(name);
      }
      // An id without a thing is not a filter anybody can act on: entity ids
      // are unique in practice but the column is not, and "which entity" is
      // half of what identifies a row here.
      if (entityId !== undefined && entity === undefined) invalid.push('entity');
      for (const [name, value] of [['from', from], ['to', to]]) {
        if (value !== undefined && !isInstant(value)) invalid.push(name);
      }
      // A range that cannot contain anything is a mistake somebody made, and
      // an empty page would look like an answer.
      if (isInstant(from) && isInstant(to) && from > to) invalid.push('from');
      if (invalid.length > 0) throw unprocessable(invalid);

      const filters = { actorId, entity, entityId, from, to };
      return {
        items: listTrail(db, { ...filters, limit, offset }).map((row) => {
          // `diff` is one JSON column holding { before, after } — parsed here
          // because a client parsing our storage format makes our storage
          // format the contract. The same reasoning the ticket history gives.
          const { before, after } = JSON.parse(row.diff);
          return {
            id: row.id,
            // Null, not the sentinel. The sentinel is a word for asking a
            // question; the answer says plainly that nobody did this.
            actorId: row.actor_id,
            entity: row.entity,
            entityId: row.entity_id,
            verb: row.verb,
            at: row.at,
            before,
            after,
          };
        }),
        // What matches, not what this page holds.
        total: countTrail(db, filters),
        limit,
        offset,
      };
    },
  };
}

export { SYSTEM_ACTOR };
