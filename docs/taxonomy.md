# The taxonomy

**One name per thing.** This file is the only place that defines what a feature is
called, and every other place in the repository uses that name unchanged: the code
folder, the plan folder, the story id, the branch, the test file.

The previous attempt at this product carried four names for one feature — an epic
called `feature/sla`, a plan folder called `service-levels`, a code folder called
`sla`, and a block number. Nothing pointed at anything else, and the only way to
know they were the same thing was to already know.

---

## The features

Sixteen domains. A domain is **what the product does**, never what layer it lives
in and never when it was built.

| Slug | Prefix | Owns | `api/src/features/` | `web/src/` |
|---|---|---|---|---|
| `platform` | `PLT` | migrations, error shape, request id, health, logging, CI, the checks | — *(platform/)* | `app`, `shared` |
| `identity` | `IDN` | sign-in, users, roles, throttling, passwords, sessions | `identity` | `entities/user` |
| `customers` | `CUS` | the customer record, contacts, search, hiding | `customers` | `entities/customer` |
| `tickets` | `TCK` | the ticket, the queue, the state machine, categories | `tickets` | `entities/ticket` |
| `conversation` | `CNV` | replies, internal notes, the timeline | `conversation` | `entities/message` |
| `service-levels` | `SLA` | the promise about time, pauses, breaches, escalation | `service-levels` | — |
| `notifications` | `NTF` | telling somebody that something happened | `notifications` | — |
| `channels` | `CHN` | how a request enters the system from outside | `channels` | — |
| `portal` | `POR` | the customer-facing surface | — | `pages/portal` |
| `reports` | `RPT` | numbers an admin can act on | `reports` | `pages/reports` |
| `audit` | `AUD` | the record of every change | `audit` | — |
| `administration` | `ADM` | permission middleware, the error contract, user management | `administration` | `pages/admin` |
| `knowledge-base` | `KB` | articles, published and searched | `knowledge-base` | `entities/article` |
| `satisfaction` | `SAT` | ratings, and the number they add up to | `satisfaction` | — |
| `assist` | `AST` | the AI helper and its fallback | `assist` | — |
| `i18n` | `I18N` | two languages, both directions | — | `shared/i18n` |

**A slug is never abbreviated in one place and spelled out in another.** If the
table says `service-levels`, then the code folder is `service-levels`, not `sla`.

---

## A story id

```
TCK-2-API
│   │  └── the layer
│   └───── the number, unique inside the feature
└───────── the feature prefix from the table above
```

**Every id carries its layer, from the first one.** `API`, `WEB`, `MOB`.

The previous attempt left the layer off the API half — `SLA-3` was the API and
`SLA-3-WEB` was the screen — which made "no suffix means API" a rule that lived
only in somebody's head. A reader holding `RPT-1` could not tell what it was
without opening the file.

**A story that spans layers is several stories in one feature**, one per layer,
sharing a number:

```
TCK-2-API    the queue endpoint: filters, sorting, paging
TCK-2-WEB    the queue screen
TCK-2-MOB    the queue on a phone
```

They share a number because they are one piece of work seen from three sides. They
are separate files because they ship separately and each has its own tests.

**A layer with no work simply has no file.** There is no `SLA-1-WEB`, because
computing a due time is not something a screen does.

---

## There is no `mobile` feature, and no `backend` or `web` either

Those are layers. A folder named after a layer puts *sign in on a phone* next to
*read a report on a phone* and separates *sign in on a phone* from *sign in in a
browser* — which is exactly backwards, because the second pair share a rule and
the first pair share nothing but a screen size.

The previous attempt had a `mobile/` plan folder holding `AND-1`…`AND-5`. Those
five stories are really:

```
was              is now
AND-1     →      IDN-1-MOB  ·  TCK-2-MOB
AND-2     →      TCK-7-MOB  ·  CUS-2-MOB
AND-3     →      CNV-1-MOB  ·  TCK-3-MOB
AND-4     →      I18N-2-MOB
AND-5     →      SLA-3-MOB
```

Each now sits beside the rule it renders, and the dependency on that rule is
visible in the same folder instead of being written down in prose.

---

## A block is an attribute, not a folder

A block — a sprint — is **when** a story shipped. It is one field in the story's
intake and one tag in git. It is never a directory, and it never appears in a file
name.

```
.squad/stories/tickets/TCK-2-WEB/intake.md     ← where it lives: its feature
Block: 2                                        ← when it shipped: a field
git tag block-2                                 ← the record
```

Ordering plans is the feature's own business: numbering restarts at `01` inside
each feature, and `naming.globalSequence` is `false`. The previous attempt set it
to `true`, so `service-levels/` held `01 02 03 04` and then jumped to `09` — the
gap being a different feature entirely.

---

## What derives from what

**One fact, one home.** Everything else is computed, so it cannot drift.

```
the code            →  what exists
git tags            →  which blocks closed
## Done Criteria    →  what has been built     (scripts/plan-status.mjs)
this file           →  what anything is called (scripts/verify-taxonomy.mjs)
```

No document restates another document. The previous attempt kept the story list in
a task list and a plan folder at the same time, in different words, with a
hand-typed status column in each. They disagreed within a day, and the check that
was supposed to catch it read only one of them.
