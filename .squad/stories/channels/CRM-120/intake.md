> **Fetched from jira:** [CRM-120](https://mazen-al-nabarawy.atlassian.net/browse/CRM-120)  
> *Fetched 2026-08-30T02:51:39.360Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** CHANNELS-3-API system — the public intake is throttled per address  
**Type:** Story  
**Status:** To Do  
**Labels:** backend, channels, pts-3, sprint-5, system

### Description

system — the public intake is throttled per address

Story folder: .squad/stories/channels/CHANNELS-3-API-intake-throttle/

Rules this story owns:

	E-2 — Every failure returns its documented code: 400 401 403 404 409 422 429 500.

Cannot ship before: CHANNELS-1-API

Points: 3 · Sprint: 5 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/channels/CRM-120/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `channels`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-120` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `backend, channels, pts-3, sprint-5, system`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
CHANNELS-3-API system — the public intake is throttled per address
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
system — the public intake is throttled per address

Story folder: .squad/stories/channels/CHANNELS-3-API-intake-throttle/

Rules this story owns:

	E-2 — Every failure returns its documented code: 400 401 403 404 409 422 429 500.

Cannot ship before: CHANNELS-1-API

Points: 3 · Sprint: 5 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/channels.md, section CHANNELS-3-API (line 76):

The public intake is throttled per address.

*Acceptance criteria*
- Given repeated requests from one network address, when the ceiling is
  passed, then further requests answer 429 RATE_LIMITED (E-2).
- Given the throttle, then it counts every request rather than only the failed
  ones — sign-in throttles failures because a success is a legitimate person
  arriving, and an intake's successes are exactly what a flood is made of.
- Given time passing, when the window elapses, then the count resets without
  anybody clearing it by hand.
- Given the counter, then it is the one `identity.throttle.js` already
  implements rather than a second one written beside it. Two counters are two
  answers to how long a window is.
- Given the same limitations that counter already carries — process-local, and
  "address" means whatever the route hands it — then they are restated where
  this one is wired, because a limitation nobody repeats is a limitation
  somebody discovers.
```

---

## Attachments

Place files in `attachments/` next to this `intake.md`, then list them here so the planner knows what to open.

| File (relative to this folder) | What it is |
| ------------------------------ | ---------- |
| *(e.g. `attachments/flow.png`)* | *(e.g. UX flow)* |

*(Add rows per file. If none, write "None.")*

---

## Dependencies

- **Blocked by / related ids:** (tracker ids only; optional short note)
- **Depends on code areas or other stories:**

## Extra notes (optional)

- Anything not captured above (e.g. chat context) — keep short.

## Technical hints (optional)

<!-- standing-hints -->
- **Read first, before anything else:** `.squad/plan-lessons.md` — one rule per
  defect an earlier plan review found. A plan that repeats a listed defect is
  rejected in review.
- **Ids:** cite other stories as FULL-NAME ids with the Jira key —
  `PLATFORM-13-ALL (CRM-28)`. The id comes from `scripts/backlog.txt` (or the
  generated `BACKLOG.md`); **the key comes from `scripts/story-keys.txt`, which
  lists every story's key and is generated from the tracker.** Do not work a key
  out by counting — three plans did, and each named the wrong story.
  Documents under `docs/` may lag; the backlog is the authority.
- **Structure:** `docs/taxonomy.md` (names), `docs/architecture.md` (where code
  goes), `docs/git.md` (branches and commits) — cite them, do not restate them.
- **Nothing committed may mention AI assistance** — commits, docs, or ignore-file
  entries. Verification steps must include the grep that proves it.
- **The package manager is npm**, and there is no workspace root. Commands run
  from the package directory: `cd api && npm test`, `cd web && npm run build`.
  Not pnpm, not yarn, no `--filter`, no `--prefix` — three plans in a row
  reached for pnpm, so every command in their verification steps was wrong.
- **The web suite does not typecheck.** `npm test` is vitest; `npm run build` is
  `tsc -b && vite build`. A change only vitest has seen is not verified.

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

**The counter already exists.** `api/src/features/identity/identity.throttle.js`
is `createSignInThrottle({ now, windowSeconds, emailCeiling, addressCeiling })`
— two keyed Maps, expiry read rather than swept, with both of its limitations
written at the top of the file. Reuse it, or lift the shared part out of it;
do not write a second counter. Two counters are two answers to how long a
window is.

**Count successes as well as failures, and say why in a comment.** The sign-in
throttle counts failures on purpose — a successful sign-in is a legitimate
person arriving. An intake's successes are exactly what a flood is made of, so
this one counts every request. That difference is the reason the two ceilings
are different numbers, and a reader who does not meet it will "fix" one to
match the other.

**Restate the limitations where this one is wired.** The existing file says the
counters are process-local and that "the caller decides what address means" —
`app.js` sets no trust-proxy, so behind a reverse proxy the address is the
proxy. A limitation nobody repeats is a limitation somebody discovers.

**429 RATE_LIMITED is already in the catalogue** (`errors.js`) and already used
by `IDENTITY-4-API (CRM-47)`. Nothing new is needed there.


## Out of scope

- What this story explicitly does **not** cover:

- **Throttling anything but the public intake.** Sign-in already has its own.
- **A shared store across processes.** The existing counter names that as a
  deliberate gap; this story does not close it.
- **Any `web/` change.**

