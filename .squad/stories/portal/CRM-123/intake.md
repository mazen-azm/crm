> **Fetched from jira:** [CRM-123](https://mazen-al-nabarawy.atlassian.net/browse/CRM-123)  
> *Fetched 2026-08-30T10:11:14.277Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** PORTAL-3-WEB customer — I read my ticket: the replies, never the internal notes  
**Type:** Story  
**Status:** To Do  
**Labels:** customer, portal, pts-3, sprint-6, web

### Description

customer — I read my ticket: the replies, never the internal notes

Story folder: .squad/stories/portal/PORTAL-3-WEB-replies-not-notes/

Rules this story owns:

	SC-2 — Every rule is enforced in the API; no client enforces anything.

Cannot ship before: CONVERSATION-2-API, PORTAL-2-WEB

Points: 3 · Sprint: 6 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/portal/CRM-123/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `portal`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-123` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `customer, portal, pts-3, sprint-6, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
PORTAL-3-WEB customer — I read my ticket: the replies, never the internal notes
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
customer — I read my ticket: the replies, never the internal notes

Story folder: .squad/stories/portal/PORTAL-3-WEB-replies-not-notes/

Rules this story owns:

	SC-2 — Every rule is enforced in the API; no client enforces anything.

Cannot ship before: CONVERSATION-2-API, PORTAL-2-WEB

Points: 3 · Sprint: 6 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/portal.md, section PORTAL-3-WEB (line 79):

A customer reads their ticket: the replies, never the internal notes.

*Acceptance criteria*
- Given a customer's own ticket, then they can open it and read its thread —
  the public replies, oldest first, each saying who wrote it and when.
- Given the desk's internal notes, then nothing on the screen shows them, hints
  at them, or leaves a gap where they were. The API does not send them
  (CONVERSATION-2-API); this screen has nothing to filter, and a test asserts it
  filters nothing — a screen that hid what it had been given would mean the API
  had sent it.
- Given a reply from the desk, then it is distinguishable from the customer's
  own without either being labelled by role in a way that reads as a status.
- Given a resolved ticket inside the window, then the customer can reply, and
  replying reopens it (T-5) — the screen says that will happen before they do
  it, rather than surprising them with a status change.
- Given a long thread, then the screen pages it using the API's window and adds
  none of its own (BR-4).
- Given somebody else's ticket id typed into the address, then the screen shows
  what a missing ticket shows. It has nothing else to show, because the API
  answers the same 404 for both.
- Given every string, then it came from a resource file, in both languages, and
  the thread reads in both directions (BR-6).
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
  out by counting — two plans did, and both named the wrong story.
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

**The stack is Vite + React 19 + TypeScript, Vitest and Testing Library.**
`useTranslation()` returns `{ t }` where `t` is a plain object of strings —
there is **no** `useT()` and **no** interpolation function. The resource files
are nested objects one level deep with camelCase leaves, not dot paths.

**`useRequest` is the four-state hook** (`idle | loading | success | error`) and
its error carries `fields`. Do not invent a second shape for a request.

**`request(path)` already prefixes `/api/v1`** (`shared/api/base-url.ts:3`).

**BR-6:** keys go into `en.ts` and `ar.ts` in the same edit or
`shared/i18n/parity.test.ts` fails, and `pages/no-hardcoded-strings.test.ts`
catches a literal in JSX — including a separator typed between tags.

**`t.errors[code]` is a default, not a law.** It is keyed by what the API
answered, not by what the person was doing when it answered. Two screens have
already needed their own sentence for a code the map already had: a 401 on the
change-password screen (the shared one says the session ended, and it has not),
and a 429 on the public intake (the shared one says "too many attempts", told
to somebody who may have made one). Read the shared sentence before reusing it.

**Never a native validator.** No `type="email"`, `pattern`, `required`, `min`
or `max` on a form whose rules the API owns: the browser refuses to submit and
the API's rule never runs, and the sentence somebody reads is the browser's —
wrong language, unstyled, outside the resource files (L-55). `type="password"`
is fine; it changes display, not whether a value may be sent.

**A value interpolated into a translated sentence needs a bidi isolate**,
U+2068 … U+2069 (L-51) — see `pages/tickets/history-sentence.ts`.

**A fetch stub must build a fresh `Response` per call** (L-30).

**Anything rendering the desk shell must stub `/me`** — the shell asks who is
signed in, because a customer sees none of the desk's screens.
`src/testing/stub-me.ts` does it.

**`npm test` does not typecheck.** `npm run build` is `tsc -b && vite build`,
and it has caught what ten green tests could not.

**A route only its author can navigate to is a route that does not exist.**
Three screens have had to fix that; wire the way in with the screen.

**`MyTicketsPage.tsx` lists them; this reads one.** A route under the portal,
reachable from that list, and the list's rows are the way in — a screen nothing
links to is a screen only its author can reach.

**The screen filters nothing, and a test says so.** The API does not send
internal notes (`CONVERSATION-2-API`), so there is nothing here to hide. A test
that asserted this screen hid them would be asserting the API had sent them.

**Say that replying reopens it, before they reply.** A resolved ticket inside
the window can be reopened by a reply (T-5), and somebody who did not expect
that reads the status change as a fault.

**Somebody else's ticket id typed into the address** shows what a missing
ticket shows — because the API answers the same 404 for both, and the screen
has nothing else to show.

**`statusLabel` in `pages/tickets/ticket-labels.ts`** is where a status becomes
a word. Two copies of that mapping disagree the first time one changes.


## Out of scope

- What this story explicitly does **not** cover:

- **Any `api/` change.**
- **Rating, and reading knowledge-base articles.** Later stories own each.

