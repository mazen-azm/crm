> **Fetched from jira:** [CRM-56](https://mazen-al-nabarawy.atlassian.net/browse/CRM-56)  
> *Fetched 2026-08-29T01:24:22.603Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** CUSTOMERS-1-WEB agent — I search by name, address or number  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, customers, pts-3, sprint-2, web

### Description

agent — I search by name, address or number

Story folder: .squad/stories/customers/CUSTOMERS-1-WEB-customer-search/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: PLATFORM-2-API

Points: 3 · Sprint: 2 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/customers/CRM-56/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `customers`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-56` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, customers, pts-3, sprint-2, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
CUSTOMERS-1-WEB agent — I search by name, address or number
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — I search by name, address or number

Story folder: .squad/stories/customers/CUSTOMERS-1-WEB-customer-search/

Rules this story owns:

	BR-4 — No unbounded list: paginated, filterable, sortable, with a maximum page size.

Cannot ship before: PLATFORM-2-API

Points: 3 · Sprint: 2 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/customers.md, section CUSTOMERS-1-WEB:

- Given the screen, when a search returns nothing, then the empty state says so
  and offers the next action, rather than showing a blank region (D-2).
- Given a search in flight, when the screen renders, then it shows the shared
  loading state and does not jump when the results arrive.
- Given a failed search, when the screen renders, then it shows the documented
  code's meaning and offers retry.
- Given every string on the screen, when it is read, then it came from a
  resource file, in both languages (BR-6).
- Given the results, when they are paged, then the screen uses the API's paging
  and adds none of its own.
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`. **`web/` only** — `CUSTOMERS-1-API` (CRM-55) is the endpoint and ships first.

**This is the first screen with a list, and therefore the first real consumer
of the three state components.** `EmptyState`, `ErrorState` and `Skeleton` were
built by `PLATFORM-16-WEB` (CRM-31) with no caller — the story said so plainly
rather than inventing one. This is that caller. Use all three; if any of them
turns out not to fit, that is a finding worth reporting, because it means the
shapes were guessed wrong and nobody would otherwise find out.

**The states map to `useRequest`'s statuses, which already exist.**
`web/src/shared/hooks/useRequest.ts` is `idle | loading | success | error`, and
its comment says it is the only place a screen expresses loading. `success`
with an empty `items` array is the empty state — not a fourth status.

**Every colour is a token and every string is in both dictionaries.** Both are
enforced: `tokens.test.ts` scans all of `web/src` (D-1), and
`no-hardcoded-strings.test.ts` scans `pages`, `features`, `app` and
`shared/ui`. A screen under `pages/` is in scope, so a bare label fails the
suite. Add the keys to `en.ts` and `ar.ts` in the same commit — `defineLocale`
fails the build on one file having a key the other lacks, and
`parity.test.ts` fails on an empty value or a copied one.

**Paging comes from the API's envelope, not from the screen.** The endpoint
answers `{ items, total, limit, offset }` and refuses a limit above the ceiling
rather than clamping it (BR-4, `readPagination`). The screen renders what it
was given and asks for the next window; it does not slice, does not re-count,
and does not invent its own page size beyond choosing a limit to request.

**Decide about typing, and say which.** A request per keystroke is a request
per keystroke. Debounce, search on submit, or something else — all defensible,
and the decision belongs in the plan with its reason. Note that the test
harness's fetch refuses anything unstubbed, so whatever is chosen has to be
testable without timers being guessed at.

**The route and the way in.** There is one authenticated route today (`/`) and
the shell renders one navigation item. A customers screen needs a route inside
`RequireAuth` and inside `DeskShell`, and a nav item beside the existing one —
which is the first time the shell's navigation carries more than one thing, so
it is worth checking it still reads as navigation rather than as a list of one.

**Dates and numbers, if any are shown, go through the formatters** —
`useFormatters` from `shared/i18n`, built by `LANGUAGES-3-WEB` (CRM-39), which
also has no caller yet. A `created_at` rendered with `toLocaleDateString` and
no locale would be the hand-written pattern that story exists to prevent.

## Out of scope

- What this story explicitly does **not** cover:

- **The endpoint** — `CUSTOMERS-1-API` (CRM-55). This story consumes it.
- **A customer detail screen** — `CUSTOMERS-2-WEB`, not built. Rows may be
  inert, or link nowhere yet; say which and why.
- **Creating, editing or deleting a customer** from the screen — later stories.
- **Internal notes** — `CUSTOMERS-3-API` (CRM-60) is the API for those and has
  no screen in this sprint.
- **Sorting controls.** The endpoint picks one stable order; a control belongs
  with the story that asks for one.
- **Any `api/` change.** If the endpoint's shape is wrong for the screen, that
  is a finding to report, not a licence to edit it here.
- **Changing the state components, `useRequest`, or the shell's layout** beyond
  adding a route and a navigation item.
