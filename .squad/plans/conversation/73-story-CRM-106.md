# Story 73 — A long thread pages rather than arriving whole (Story: CRM-106)

**Written by hand, after the fact, and not by the planner. Read this first.**

The planner was started on this intake and stopped before it wrote anything.
Every one of CONVERSATION-4-API's four acceptance criteria was already met by
code shipped under `CONVERSATION-1-API (CRM-99)` and `CONVERSATION-2-API
(CRM-102)`: the route reads its window with the shared `readPagination`
(`api/src/platform/http/pagination.js:15`), the query orders by
`created_at ASC, rowid ASC` and the count carries the same `publicOnly`
predicate as the list (`api/src/features/conversation/conversation.repository.js:36`
and `:52`).

A plan for shipped code is a description wearing a plan's clothes. So none was
generated, and this file records what the story actually turned out to be.

## What was left, and was done

The behaviour was right and **unpinned**. No test named CONVERSATION-4-API, and
the paging assertions that existed lived inside `note-leak.guarantee.test.js`,
which is about who may read a note — a file whose subject is a different rule.
A route that pages correctly and has nothing saying it must is one refactor
away from paging differently, and the refactor would be green.

`api/src/features/conversation/thread-paging.test.js` now proves the section.
Seven tests, and each was checked against a mutation:

| Mutation | Result |
|---|---|
| Clamp the window instead of refusing it | 2 failed |
| `ORDER BY created_at DESC` | 2 failed |
| The count drops the `publicOnly` predicate | 2 failed |
| The list drops it while the count keeps it | 2 failed |
| Drop `rowid ASC` from the tiebreak | **passed** — see below |

The last one is the honest finding, and it is the same one
`note-leak.guarantee.test.js` already records: every SQLite index carries the
rowid as its payload, so a scan over `(ticket_id, created_at)` is already in
rowid order among equal keys. The clause stays because the guarantee belongs in
the query rather than in a property of how one engine stores an index — but no
test on this engine can fail without it, and claiming otherwise would be worse
than saying so.

## Done Criteria

- [x] A thread is paginated with the ceiling every list obeys — the shared `MAX_LIMIT`, cited from `pagination.js` rather than retyped.
- [x] The answer says what it gave and from where: `items`, `total`, `limit`, `offset`, and nothing else.
- [x] The order is oldest first and stable — pinned at two window sizes, with three messages sharing one second.
- [x] Pages cover the thread exactly once: no gap and no repeat across a window boundary.
- [x] The total is the number of messages the reader may see, and a customer's last page is theirs and not the desk's.
- [x] A refused window is refused rather than clamped, and `fields` names the parameter — never the value that was sent.
- [x] Every mutation above was run, and the one that passes is recorded rather than hidden.
- [x] `cd api && npm test` passes; the six guard scripts pass.
- [x] No commit, doc or ignore-file entry mentions AI assistance.
