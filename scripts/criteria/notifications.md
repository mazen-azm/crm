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

## NOTIFICATIONS-2-API

Reading them, and the count that makes a screen worth opening.

Written 2026-08-31, with the sprint 8 stories.

**Most of this shipped with NOTIFICATIONS-1-API**, and saying so is part of the
story rather than a caveat on it. The list and the mark-read route were built
there because a feature that writes rows nothing can read is not a feature —
its criteria state the paging, the ownership and the idempotence, and the tests
that prove them are `told-when-mine.test.js`. What is left is what a screen
needs and could not get.

*Acceptance criteria*
- Given the list, then it can be narrowed to the unread ones. A person with
  four hundred read notifications and two new ones cannot find the two by
  paging, and the alternative — the screen fetching every page and filtering —
  is the client inventing a query the server can answer.
- Given any read of the list, then the number of unread ones comes back with
  it. A screen showing a badge should not have to ask twice, and a count
  derived from the page it happens to be holding is wrong on every page but
  the first.
- Given that count, then it is the number unread and not the number returned:
  the two differ the moment a window is applied, and a badge that changed when
  somebody turned the page would be reporting the page rather than the person.
- Given the filter, then a value that is not one of the two it allows is
  refused naming the field, the same way every other list here refuses a
  window it does not allow (BR-4).
- Given the ordering, then the unread view keeps it: oldest first, as the whole
  list is. A person clearing a backlog works from the oldest.
- Given a customer, then the route still refuses them. Nothing writes a
  notification for a customer, so an open route would offer an empty list
  forever; the backlog's actor column says `any` and the honest reading is
  "any staff member", because `any` cannot mean somebody the feature never
  writes for. When a story writes one for a customer, this opens with it.

*Out of scope*
- Marking everything read at once. Nothing asks for it, and a button that
  clears a list somebody has not read is the opposite of what the list is for.
- Deleting a notification. BR-1, and nothing asks.
- A screen — `NOTIFICATIONS-2-WEB`.

## NOTIFICATIONS-2-WEB

Somewhere to read them.

Written 2026-08-31, with the sprint 8 stories.

*Acceptance criteria*
- Given a signed-in staff member with unread notifications, then the shell says
  how many, from wherever they are. A notification nobody can see from the
  screen they are on is a notification that waits until somebody goes looking.
- Given the screen, then each notification says what happened and which ticket
  it was about, and the ticket is one click away. The row carries an id and the
  screen resolves it — the same rule the ticket history follows for names.
- Given a notification, then reading it is deliberate: opening the list marks
  nothing. An agent who glances at the screen has not dismissed what is on it.
- Given one marked read, then the screen and the count follow without a
  reload, from the answer the write returned.
- Given none at all, then the screen says so rather than showing an empty
  frame, and the shell shows no count rather than a zero.
- Given every string, then it came from a resource file, in both languages
  (BR-6), and every time is in the reader's locale (BR-3).

*Out of scope*
- Any `api/` change — `NOTIFICATIONS-2-API` owns the route, the filter and the
  count.
- Live updates. The count is what the last read said; nothing polls and nothing
  subscribes, and no story asks for either.
