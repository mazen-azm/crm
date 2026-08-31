import { randomUUID } from 'node:crypto';

import { HttpError } from '../../platform/http/errors.js';
import { createAuditWriter } from '../audit/index.js';
import {
  countNotifications,
  findNotificationForUser,
  insertNotification,
  listNotifications,
  markNotificationRead,
} from './notifications.repository.js';

// The one thing that happens today. A constant rather than a literal at the
// call site, so the vocabulary is somewhere a reader can find it — and so the
// second kind, whenever a story asks for one, is added beside it.
export const TICKET_ASSIGNED = 'ticket.assigned';

export function createNotificationsService({ db, now = () => Math.floor(Date.now() / 1000) }) {
  const stamp = () => new Date(now() * 1000).toISOString();
  const audit = createAuditWriter({ db });

  return {
    // A ticket became somebody's. Written from inside the assignment's
    // transaction, so an assignment nobody is told about cannot happen and
    // neither can a notification for an assignment that did not.
    //
    // It opens no transaction of its own: SQLite refuses BEGIN inside BEGIN,
    // and this is the same seam tickets.unassignAllFor and identity.makeUser
    // use.
    //
    // The actor is passed so this can decide NOT to write. Telling somebody
    // what they just did is noise, and noise is what makes a notification list
    // stop being read.
    ticketAssigned(actor, { ticketId, assigneeId, at }) {
      if (!assigneeId) return null;
      if (actor?.id === assigneeId) return null;

      const id = randomUUID();
      const written = insertNotification(db, {
        id,
        userId: assigneeId,
        ticketId,
        kind: TICKET_ASSIGNED,
        at: at ?? stamp(),
      });

      audit.record(actor, {
        entity: 'notification',
        entityId: id,
        verb: 'notification.create',
        before: null,
        // Who it is for and what it is about. Not the ticket's subject: this
        // row does not hold one and the trail should not invent one.
        after: { userId: assigneeId, ticketId, kind: TICKET_ASSIGNED },
        at: at ?? stamp(),
      });

      return written;
    },

    // Mine, and only mine. There is no route that reads anybody else's, and
    // the query is scoped rather than filtered afterwards — filtering after
    // the fact means the rows were fetched and are one mistake from the
    // response.
    mine(actor, { limit, offset }) {
      return {
        items: listNotifications(db, { userId: actor.id, limit, offset }),
        total: countNotifications(db, { userId: actor.id }),
        limit,
        offset,
      };
    },

    // Reading a list must not change what is in it, so this is a write of its
    // own: an agent who glances at the screen has not dismissed everything on
    // it.
    read(actor, { id }) {
      const at = stamp();

      const held = findNotificationForUser(db, { id, userId: actor.id });
      // Somebody else's is not found rather than refused — one answer, so
      // nothing about it says whether the id exists.
      if (!held) throw new HttpError(404, 'NOT_FOUND');

      const changes = markNotificationRead(db, { id, userId: actor.id, at });
      // Already read is not a second event. No row, no audit entry, and the
      // moment it was first read does not move.
      if (changes === 0) return held;

      audit.record(actor, {
        entity: 'notification',
        entityId: id,
        verb: 'notification.read',
        before: { readAt: null },
        after: { readAt: at },
        at,
      });

      return findNotificationForUser(db, { id, userId: actor.id });
    },
  };
}
