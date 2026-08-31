# Notifications — acceptance criteria

Telling somebody that something happened.

Written 2026-08-31, before NOTIFICATIONS-1-API was planned, because the feature
had no criteria file. That gap is L-7.

Only the one story in this sprint is written here.

**What a notification is, in this product.** A row an agent can read, and
nothing else. No email, no push, no socket: the brief puts delivery channels
under Specified rather than Required, and building one would be building the
channel rather than the notification. The desk reads its own, the way it reads
its queue.

**Why it is a record and not a side effect.** The alternative was to derive
"what is new for me" from the audit trail at read time. It was refused: the
trail is about what happened to a TICKET, a notification is about what a PERSON
has not yet seen, and one of those is a fact the other cannot answer. Read
being unread is a piece of state, and state has to be written somewhere.

## NOTIFICATIONS-1-API

An agent is told when a ticket becomes theirs.

*Acceptance criteria*
- Given a ticket assigned to an agent, then a notification exists for that
  agent naming the ticket, and it is unread.
- Given the agent who did the assigning, when they assign a ticket to
  themselves, then no notification is written. Telling somebody what they just
  did is noise, and noise is what makes a notification list stop being read.
- Given a ticket unassigned, or reassigned away from them, then nothing is
  written for the person who lost it. NOTIFICATIONS-1-API is "becomes mine",
  and no story says otherwise — stated here rather than left for somebody to
  wonder.
- Given the assignment and the notification, then they are written together or
  not at all. An assignment nobody is told about is the bug this story exists
  to fix, and a notification for an assignment that did not happen is worse.
- Given an agent reading their notifications, then they get their own and only
  their own, oldest first, paged with the API's window (BR-4) — and somebody
  else's are not reachable by any request they can make.
- Given a notification, then it carries the ticket's id rather than a copy of
  its subject. A subject copied at assignment time is a subject that goes
  stale, and the screen that shows it can resolve an id.
- Given the read, then marking one read is a write of its own: reading a list
  must not change what is in it, or an agent who glances at the screen has
  dismissed everything on it.
- Given a notification already read, then marking it read again is not a second
  event and writes no second row.
- Given the writes, then they are audited like any other mutation (BR-2).

*Out of scope*
- Any delivery channel — email, push, or a live connection. The brief puts
  those under Specified, and this story is the record they would each read.
- A screen. Nothing in this sprint draws one; the route is what the story asks
  for, and a route nothing calls is a stated gap rather than an oversight.
- Notifying anybody about anything else — a reply, a status move, a service
  level about to be missed. Each would be its own story, and none is written.
