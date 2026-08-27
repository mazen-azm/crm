# The blocks

A block is a sprint. Eleven of them. Each one ends with something that can be
**shown working to a person**, not with a layer being finished.

Velocity is 36 points, measured on the previous attempt at this product across two
blocks. The numbers below are held near it deliberately.

---

## What changed from the previous attempt, and why

Four of these are corrections to sequencing mistakes that were paid for once
already.

**The structure is not a block.** The previous attempt organised both applications
by layer, then spent a whole block reorganising them by feature once one service
had reached 367 lines doing five jobs. That refactor touched 136 points of code;
had it been left later it would have touched 378. Here the shape is right in
block 0 and enforced by a check from the first commit, so there is nothing to
reorganise.

**The web test setup is in block 0.** Previously 111 points of web work shipped
with no test of any kind, because Definition of Done said "tests pass" without
saying which layers needed them. A block that adds a test setup and then postpones
using it has added nothing.

**Both languages are in block 0.** This one the previous attempt got right and it
is repeated: writing the strings file before the first screen meant switching to
Arabic took one click and exposed two real defects immediately.

**Mobile is two blocks, not one.** Previously all 33 points sat in a single block
on the least familiar stack, with nothing shippable until the whole thing landed.
When its first story stalled on a dependency-injection decision, the entire block
stalled with it. Split here, block 7 ends with a working queue on a phone even if
block 8 slips.

---

## The order

| # | Goal | Features | Pts |
|---|---|---|---|
| 0 | **Foundation** — the shape, the contract, the checks | `platform` `i18n` | 34 |
| 1 | **Identity and customers** — somebody signs in and finds a person | `identity` `customers` | 36 |
| 2 | **The ticket** — the queue, the state machine, the history | `tickets` `service-levels` | 38 |
| 3 | **Close the loop** — a stranger can reach the system | `channels` `portal` `customers` `identity` | 35 |
| 4 | **The conversation** — a ticket that can be answered | `conversation` `tickets` `customers` | 33 |
| 5 | **Promises and people** — deadlines, and more than one agent | `service-levels` `notifications` `tickets` `identity` | 37 |
| 6 | **Numbers and the record** — what an admin reads | `reports` `audit` `administration` | 32 |
| 7 | **The phone, part one** — sign in and work the queue | `platform` `identity` `tickets` `customers` | 34 |
| 8 | **The phone, part two** — answer, and in Arabic | `conversation` `tickets` `i18n` `service-levels` | 30 |
| 9 | **Knowledge and satisfaction** | `knowledge-base` `satisfaction` `tickets` `reports` | 34 |
| 10 | **Assist and hardening** | `assist` `administration` `platform` | 33 |

---

## What each block can be shown doing

Written as the thing a person watches, because a block that cannot be demonstrated
has not closed.

- **0** — An unknown route returns the documented error shape with a request id.
  A translation key added to English and not Arabic fails the build, naming the
  file. The architecture check refuses an import that reaches inside a feature.
- **1** — Sign in as an agent, search a customer by a fragment of their number,
  open their screen. Sign in as a disabled account and be refused.
- **2** — Raise a ticket, watch both due times appear from its priority, filter
  the queue four ways, walk it through the state machine, and be told what is
  legal when a move is not.
- **3** — A stranger raises a ticket on the public form with no account. The same
  address in different casing becomes one customer with two tickets. An agent
  hands that customer a sign-in, and they see their own requests and nothing else.
- **4** — An agent replies, then writes an internal note. The customer's payload
  does not contain the note's words. She replies; the resolved ticket reopens.
- **5** — A ticket breaches, the row is written once, the escalation fires once,
  and running the job twice changes nothing. Two agents edit one ticket and the
  second is refused by a revision counter.
- **6** — Four numbers an admin can act on, none of them computed in the browser.
  The audit log can be read and there is no route that writes to it.
- **7** — Sign in on a phone and work the queue, against the same API with no
  change to it.
- **8** — The same workflow on a phone, in Arabic, right to left, with late
  tickets marked.
- **9** — An article dropped into a reply as editable text, a ticket found by its
  text, and a rating showing up in a report.
- **10** — The assist summarising a long ticket, and the same screen still working
  with the key removed.

---

## The one rule about ordering

**A client half is never scheduled before its API half has landed.**

The previous attempt planned a screen against a field that did not exist yet. The
planner spent its entire context hunting for the field and produced a plan naming
invented paths, which was thrown away twice before the rule was written down.

`TCK-2-WEB` may sit in the same block as `TCK-2-API`, but never in an earlier one,
and its plan is written only once the API half is merged.
