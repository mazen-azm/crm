# CLAUDE.md — Support Desk

A customer support CRM. **One repository, three roots:**

```
api/       Node 26 + Express 5 + node:sqlite   every business rule
web/       React 19 + Vite + TypeScript        the agent's desk
android/   Kotlin + Compose                    the agent away from it
```

This is the second time this product has been built. The first attempt shipped
blocks 0–7 and works; it stopped because its **planning structure** had four names
for every feature and no single place listing the work. Everything below that
reads like an unusually specific rule is one that attempt paid for once.

## Read these first, in this order

| | What it settles |
|---|---|
| `docs/taxonomy.md` | **What everything is called.** Sixteen features, one name each. |
| `docs/blocks.md` | **When it gets built.** Eleven blocks, and what each demonstrates. |
| `docs/architecture.md` | **Where code goes**, and which check enforces it. |

There is no fourth map. If a document restates one of these, delete it — that is
how the previous attempt ended up with its task list and its plan folder disagreeing
inside a day.

---

## The one rule everything else follows

**Every business rule lives in the API.** A rule enforced in a client is a rule
that can be bypassed by calling the API directly.

An internal note is *never selected* rather than filtered out. An unauthorised
call is refused by middleware rather than by a missing button. The state machine
is in a service, not in a dropdown. The clients render state and send intent.
Nothing else.

---

## Naming

`docs/taxonomy.md` is the authority. In short:

```
TCK-2-WEB          feature prefix · number inside the feature · layer
```

- **The slug in the taxonomy table is the folder name**, in `api/src/features/`,
  in `.squad/plans/`, and in the branch. Never abbreviated in one place and
  spelled out in another.
- **Every id carries its layer.** `API`, `WEB`, `MOB` — including the API one.
- **There is no `mobile`, `backend` or `web` feature.** Those are layers. A story
  lives with the rule it renders.
- **A block is a field, not a folder.**

---

## Structure

**Organise by feature, then by layer inside it** — from the first commit, not
after a refactor. Node.js Best Practices, Feature-Sliced Design and Google's
Android guidance all say this independently.

Inside an API feature:

```
.routes      HTTP · req and res stop here
.schema      well-formed → 422
.service     allowed → 409 · validation lives here, not in the route
.rules       the pure part
.mapper      row → wire
.repository  SQL · nowhere else
.jobs        what happens unasked
```

Features never import each other's internals. Where one needs another's
capability, it is **injected in `api/src/app.js`**.

`node scripts/verify-architecture.mjs` enforces this. It runs on every push, and
it must be written in block 0 — the previous attempt added its checks in block 3
and the first run found nine real violations that had been accumulating.

---

## Rules that were paid for once

Each of these cost a defect, a wasted block, or a thrown-away plan.

### Correctness

- **A version is a counter, never a timestamp.** `updated_at` has millisecond
  precision, so two writes inside one millisecond share a value and a stale write
  is accepted. `revision` answers *which*; `updated_at` answers *when*.
- **A breach is a stored row, not a computation**, and escalation happens once —
  enforced by a unique constraint, not by the job remembering.
- **Due times are measured from creation**, including on a priority change. This
  can put a ticket immediately in breach. That is correct.
- **A ticket due exactly now is not in breach.** Strictly past.
- **`users` and `customers` are two tables**, joined by `customers.user_id`, null
  until that person first signs in.
- **Two SLA columns, not one.** Response and resolution are separate promises.
- **Nothing is hard-deleted**, which is why the customer email index is partial.
- **Rate limiting keys on the address prefix, not the address.** An IPv6 client
  usually holds a whole /64, so per-address limiting can be walked around
  billions of times.

### Checks

- **A check that passes over nothing is worse than no check.** A web layer check
  once walked `.js` files in a TypeScript project and reported `ok` over an empty
  set for two blocks. Every check prints what it actually read.
- **Two independent statements of one fact are compared.** Nine checks once passed
  because all nine read the same document.
- **A green tick is read together with what it resolved to.** `credential resolved
  (none)` passed as green while the thing it checked was empty.
- **A validator's issue count is not a defect count.** Read what a finding
  resolved to before believing it.
- **A path is a count of directory levels.** Moving a file changes the count
  without changing the string. This bit four times.
- **Package scripts name files that exist**, checked. `npm run seed` was broken
  for a whole block after a file move; every test passed.
- **A variable `.env.example` declares and the code refuses to start without must
  be loaded by something**, checked. The documented way to start the API did not
  start the API for six blocks.

### Working

- **An intermittent test is a report, not noise. Read its duration first.** Four
  of them: two were sockets the harness left open, one was a real race, and three
  had been dismissed as machine load.
- **Open the story in the running application, as the role it is for.** A ticket
  screen once called an admin-only endpoint; every agent saw an empty control and
  no test noticed.
- **Never write "the only X" into a plan from memory.** Put the `grep` in the plan
  and let the executor run it. `platform/db/seed.js` is a second composition root,
  so every service signature change has two call sites.
- **Do not plan ahead of the code.** A planner pointed at what does not exist
  writes invented paths.
- **A missing translation key fails the build**, on the file where the omission
  is. One component serving two audiences needs words that know which.
- **Superseded documentation is deleted, not left lying about.** It competes for
  the planner's read budget.

---

## Definition of done

1. Tests pass, **including the failure case**.
2. Validation is in the service; the failure returns its documented code.
3. It writes an audit row if it changes anything.
4. **A stranger is refused, and a test says so.**
5. Every layer named in its id is finished, or has no story.
6. Strings are in resource files, in both languages.
7. The OpenAPI document is current — a served route that is not documented
   fails the suite.
8. Committed on its branch with the reasoning in the body.
9. **Opened in the running application, as the role it is for.**
10. Demonstrable.

Items 4 and 9 came from defects rather than principle: a write path shipped with a
guard on reading and none on writing, and a screen shipped calling an endpoint the
role it was built for cannot reach. Both were invisible to a green suite.

---

## Branches

| Branch | Cut from | Merges into |
|---|---|---|
| `main` | — | — |
| `release/block-N` | `main` | `main`, at the block review |
| `<story-id>` | its block branch | its block branch |

Closing a block: tag `block-N` with what it can be shown doing, delete merged
branches, run every check.

## No AI attribution in a commit — absolutely

No `Co-Authored-By:` trailers, no tool name in a subject or body, ever. `.squad/`
and `docs/ai-usage.md` are committed deliberately because the method is part of
the deliverable; the commit rule still holds. `.squad/secrets.yaml` is never
committed.

## Who I am

Mazen — senior Flutter developer. Strong in mobile architecture, state management,
REST APIs, async. Newer to Node, React and the Android ecosystem.

Explain **why**, not just what. Skip beginner explanations. Keep answers short and
plain. Answer in English in a terminal session — no terminal here implements the
Unicode bidirectional algorithm properly, so Arabic mixed with paths and
identifiers comes out reversed. Arabic is fine in a chat window.
