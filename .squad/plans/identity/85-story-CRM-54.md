# Story 85 — Disabling somebody hands their queue back, and says how much (Story: CRM-54)

**Written by hand. The planner failed twice on this intake** — 2026-08-31
06:15, after 936s of thinking with 0 characters of output, with
`API Error: The socket connection was closed unexpectedly`; and again at 06:33,
silent for thirty minutes until it was stopped. Neither run produced a file.
That is a tool failure, not a closed quota window: `plan-next.sh` had planned
CRM-53 forty minutes earlier from the same session.

So this plan is written from a code survey, and every citation in it was read
before it was written rather than after. It is the second hand-written plan
here; `73-story-CRM-106.md` is the first, and it says why on its own face.

## Story Goal

Disabling an account unassigns the tickets that account still has to work on,
in the same transaction, and the answer says how many. An admin deciding
whether to disable somebody is deciding what happens to their work, and a
number they have to go and count is a number they will not count.

## Context — read these first

1. `api/src/features/identity/identity.service.js:253` — `disableAccount`. It
   already opens an explicit `BEGIN` / `COMMIT` / `ROLLBACK` around
   `disableUser` and its audit row, and already refuses three cases before
   starting: no such user (404), already disabled (409), and the last admin
   (409). None of those should change, and none of them should move tickets.
   It returns `{ user }` today; the count is a new field beside it, because
   existing tests read `.user`.
2. `api/src/features/tickets/tickets.service.js:481` — `assign`, for the shape
   to mirror: `assignTicket(db, …)`, `changes === 0` is the refusal, then one
   audit row with `verb: 'ticket.assign'` and `before/after: { assigneeId }`.
3. `api/src/features/tickets/tickets.repository.js:138` — `assignTicket` guards
   on `WHERE id = ? AND revision = ? AND deleted_at IS NULL` and bumps
   `revision = revision + 1` (BR-5).
4. `api/src/compose.js:27,39-40` — `tickets` is created before `identityService`,
   and `createCustomersService({ db, now, tickets, identity })` is the
   established shape for one feature holding another's service. Identity does
   not receive `tickets` today; it must.
5. `api/src/features/identity/identity.service.js:106` — `mint`, and the
   service's other cross-feature member `makeUser`, for how a method meant to
   be called from inside somebody else's transaction is written and commented.

## The two decisions this story has to make

**The revision.** `assignTicket` requires the revision the caller read, and a
sweep has read none. The answer is to read each ticket's current revision
inside the transaction and pass it — not to add a second writer without the
guard. Inside the transaction it cannot have changed, so the compare-and-set
always succeeds; and the bump still happens, which is what correctly refuses an
agent who had that ticket open when the sweep moved it. One writer, one rule.

**Which tickets.** Everything assigned to them that is not `closed`.
Unassigning is about work somebody still has to do, and rewriting who finished
a closed ticket would make the record wrong in order to tidy a queue. A
`resolved` ticket is included: it can still be reopened, and then it is
somebody's again.

## Tasks

1. **`tickets.repository.js`** — `findOpenTicketsAssignedTo(db, { assigneeId })`
   returning `id, revision, status` for live, not-closed tickets, oldest first
   so the audit rows land in a stable order.
2. **`tickets.service.js`** — `unassignAllFor(actor, { assigneeId, at })`,
   opening **no transaction of its own** (SQLite refuses `BEGIN` inside
   `BEGIN`), calling `assignTicket` per ticket with the revision just read, and
   writing one `ticket.assign` audit row each with the disabling admin as the
   actor. Returns the count.
3. **`compose.js`** — pass `tickets` into `createIdentityService`.
4. **`identity.service.js`** — `disableAccount` calls it inside its existing
   transaction, after `disableUser`, and returns `{ user, unassigned }`.
5. **`openapi.json`** — the disable route's 200 description gains the count and
   the reason for it.
6. **Tests** — `api/src/features/identity/disable-unassigns.test.js`.

## Done Criteria

- [x] Disabling an agent unassigns their non-closed tickets and answers with the count.
- [x] Each unassignment is audited as `ticket.assign` with the disabling admin as the actor.
- [x] A closed ticket of theirs is untouched; a resolved one is handed back, because a reply within its window brings it back.
- [x] The disable and the unassignments commit together or not at all.
- [x] An agent with no tickets gives a count of zero and the same disable.
- [x] Disabling twice still 409s and moves nothing; the last admin still 409s and moves nothing.
- [x] The revision is read inside the transaction and passed, and every ticket's revision is bumped — an agent holding the old one is refused.
- [x] `{ user }` still carries what it carried; `unassigned` is a new field beside it.
- [x] Documented in `openapi.json`. `cd api && npm test` (500), `cd web && npm test` (308) and the six checks green.
- [x] No commit, doc or ignore-file entry mentions AI assistance.

Six mutations run: sweeping closed tickets fails 1, leaving resolved ones
behind fails 1, auditing the agent instead of the admin fails 1, running the
sweep outside the transaction fails 6, dropping the count fails 4, and writing
without the revision guard fails 1.

**On the plan being hand-written.** The planner failing is worth recording
plainly rather than working around silently: two runs, thirty and fifteen
minutes, both producing nothing, one ending in a socket error. It planned
CRM-53 from the same session forty minutes earlier, so it is not a closed quota
window.

What that costs is the independence of GATE 2 — a plan I wrote cannot surprise
me the way a generated one does, and every generated plan so far has contained
something that was not there. The mitigation is the one available: every
citation in the plan was read out of the code before the plan was written, and
the mutation pass afterwards is unchanged and is what actually caught anything
here.
