> **Fetched from jira:** [CRM-25](https://mazen-al-nabarawy.atlassian.net/browse/CRM-25)  
> *Fetched 2026-08-28T02:19:12.750Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** PLATFORM-10-WEB developer — one palette, one file: tokens and primitives, both directions  
**Type:** Story  
**Status:** To Do  
**Labels:** developer, platform, pts-5, sprint-0, web

### Description

developer — one palette, one file: tokens and primitives, both directions

Story folder: .squad/stories/platform/PLATFORM-10-WEB-design-tokens/

Rules this story owns:

	D-1 — No colour literal outside the tokens file, in any root.

	BR-6 — Two languages, always, in resource files, never hardcoded.

Cannot ship before: PLATFORM-9-WEB

Points: 5 · Sprint: 0 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/platform/CRM-25/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `platform`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-25` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `developer, platform, pts-5, sprint-0, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
PLATFORM-10-WEB developer — one palette, one file: tokens and primitives, both directions
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
developer — one palette, one file: tokens and primitives, both directions

Story folder: .squad/stories/platform/PLATFORM-10-WEB-design-tokens/

Rules this story owns:

	D-1 — No colour literal outside the tokens file, in any root.

	BR-6 — Two languages, always, in resource files, never hardcoded.

Cannot ship before: PLATFORM-9-WEB

Points: 5 · Sprint: 0 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/platform.md, section ## PLATFORM-10-WEB (lines 288-300) — binding:

- Given the tokens file, when any component needs a colour, then it consumes a
  token — no colour literal exists outside the tokens file, in any root.
- Given the primitives, when the document direction flips, then they render
  correctly in both directions.
- Given user-facing text in a primitive, when it is read, then it comes from a
  resource file in both languages, never hardcoded.
- Given a new screen, when it is built, then it can be assembled from the
  primitives without restating spacing, radius or type scale.

Rules this story owns: D-1 (scripts/rules.txt line 40) — no colour literal
outside the tokens file, in any root. BR-6 (line 10) — two languages, always,
in resource files, never hardcoded.
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

- **What already exists (extend, do not re-create):** CRM-24 shipped `web/`
  — Vite 8, React 19, react-router 7, TypeScript 7, Vitest 4 + Testing
  Library, jsdom. Folders: `src/app` (App, routes, auth-context,
  require-auth), `src/pages/{sign-in,home}`, `src/shared/{api,hooks}`,
  `src/testing/setup.ts` (which installs a Map-backed localStorage because
  Node 26's global throws and jsdom's returns undefined). 14 web tests pass.
  **Every page is currently unstyled and carries no colour** — deliberately,
  because this story owns the first one.
- **Tokens are CSS custom properties in ONE file**, `src/shared/ui/tokens.css`,
  imported once from the app root. Colour, spacing, radius, type scale, and
  the two directions live there. A primitive reads `var(--…)`; it never writes
  `#fff`, `rgb(...)`, `hsl(...)` or a named colour. That is D-1, and it is the
  one rule with a script behind it later (PLATFORM-15-ALL).
- **Direction, not mirroring by hand.** Use CSS logical properties —
  `margin-inline-start`, `padding-inline`, `inset-inline-start`, `text-align:
  start` — so both directions come from one rule set. Do **not** write
  `[dir="rtl"] .x { … }` overrides; a stylesheet that needs a second copy for
  Arabic is the thing this criterion is against. Set `dir` on `<html>` from
  the active language.
- **Two languages in resource files** (BR-6): a tiny `src/shared/i18n/` with
  `en.ts` and `ar.ts` exporting the same key set, a `useTranslation()` reader,
  and a type that makes a key present in one file and missing in the other a
  compile error. No i18n dependency — the full library and language switching
  are LANGUAGES-1-WEB's story; this ships the resource files the primitives
  read and the seam that reads them.
- **The primitives are the smallest set the criteria need**: Button, Input,
  Field (label + input + error), Text/Heading, Stack (spacing), Card. Each
  takes its spacing and radius from tokens, and none states a pixel of its
  own. A screen assembled from them must not need to restate the type scale
  — that is the fourth criterion.
- **Rewrite the two existing pages to use them.** SignInPage and HomePage were
  shipped as bare markup precisely so this story would style them; leaving
  them bare would mean the primitives have no proof they compose.
- **The test for D-1 is this story's own**, and it must not be a broad source
  scan of the whole repo (L-10, L-13): scan `web/src/**/*.{ts,tsx,css}`
  **excluding** the tokens file, and match colour syntax in CSS declarations.
  Keep it narrow and say in a comment that the repo-wide version is
  PLATFORM-15-ALL's script.
- **Vitest 4 + Testing Library.** Tests run with no network. Direction tests
  set `document.documentElement.dir` and assert computed layout properties or
  the rendered markup, not screenshots.
- Read `.squad/plan-lessons.md` (15 lessons). L-14: name packages, not
  versions — and prefer **no new dependency at all** here; plain CSS with
  custom properties needs none. L-15: run `npm run build`, not only the
  suite — the tests transpile per file and do not typecheck the project.
- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

## Out of scope

- What this story explicitly does **not** cover:
- Language switching, the full i18n library, date and number formatting —
  LANGUAGES-1-WEB and its siblings. This story ships two resource files and
  the reader the primitives use.
- The desk shell — navigation, header, theme toggle — PLATFORM-12-WEB.
- Designed empty, loading and error states — PLATFORM-16-WEB owns rule D-2.
- The repo-wide colour-literal check across all three roots — PLATFORM-15-ALL.
  This story checks the web root only, and says so.
- Any feature screen — each feature's own `-WEB` story.
- Dark mode. A second palette is a decision nobody has made; the tokens file
  is structured so one can be added without touching a primitive.
