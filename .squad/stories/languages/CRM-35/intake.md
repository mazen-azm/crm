> **Fetched from jira:** [CRM-35](https://mazen-al-nabarawy.atlassian.net/browse/CRM-35)  
> *Fetched 2026-08-28T02:49:28.269Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** LANGUAGES-1-WEB developer — every string in a resource file, in both languages  
**Type:** Story  
**Status:** To Do  
**Labels:** developer, languages, pts-3, sprint-1, web

### Description

developer — every string in a resource file, in both languages

Story folder: .squad/stories/languages/LANGUAGES-1-WEB-strings-in-resources/

Rules this story owns:

	BR-6 — Two languages, always, in resource files, never hardcoded.

Cannot ship before: PLATFORM-9-WEB

Points: 3 · Sprint: 1 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/languages/CRM-35/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `languages`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-35` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `developer, languages, pts-3, sprint-1, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
LANGUAGES-1-WEB developer — every string in a resource file, in both languages
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
developer — every string in a resource file, in both languages

Story folder: .squad/stories/languages/LANGUAGES-1-WEB-strings-in-resources/

Rules this story owns:

	BR-6 — Two languages, always, in resource files, never hardcoded.

Cannot ship before: PLATFORM-9-WEB

Points: 3 · Sprint: 1 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/languages.md, section ## LANGUAGES-1-WEB — binding:

- Given any screen, when its source is read, then no user-facing string is
  written in it — every one comes from a resource file.
- Given the two resource files, when their keys are compared, then they carry
  the same set, and a key in one and not the other is a build failure rather
  than a blank on a screen.
- Given a string that a person will read, when it is added, then it is added
  to both files in the same change.
- Given the reader, when a screen asks for a string, then it asks by key and
  never by index or position.

Rule owned: BR-6 (scripts/rules.txt line 10) — two languages, always, in
resource files, never hardcoded.
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
- **Ids:** cite other stories only from `scripts/backlog.txt` (or the generated
  `BACKLOG.md`), as FULL-NAME ids with the Jira key: `PLATFORM-13-ALL (CRM-28)`.
  Documents under `docs/` may lag; the backlog is the authority.
- **Structure:** `docs/taxonomy.md` (names), `docs/architecture.md` (where code
  goes), `docs/git.md` (branches and commits) — cite them, do not restate them.
- **Nothing committed may mention AI assistance** — commits, docs, or ignore-file
  entries. Verification steps must include the grep that proves it.

- **Most of this already exists — this story finishes it and proves it.**
  PLATFORM-10-WEB (CRM-25) shipped `web/src/shared/i18n/` with `en.ts`,
  `ar.ts`, an `I18nProvider` that sets `dir`/`lang` on `<html>`, and a
  `useTranslation()` hook. Both pages already read every string through it.
  `web/src/shared/ui/primitives.test.tsx` already asserts the two key sets
  match. **Do not rebuild any of that.**
- **What is actually missing, and is this story's work:**
  1. **A guard that a screen holds no user-facing literal.** Today nothing
     stops the next page from typing a string inline. This is the first
     criterion and it has no enforcement.
  2. **The key-set equality must be a build failure, not only a test.** The
     second criterion says "build failure". Today `ar.ts` is typed
     `Messages`, so a *missing* key already fails `tsc`. Verify that claim by
     breaking it, and state in the plan what the type does NOT catch — an
     **extra** key in `ar.ts` that `en.ts` lacks — and close that gap.
  3. Strings are looked up **by key**; confirm nothing indexes the dictionary
     positionally, and that no code does `Object.values(t)[n]`.
- **The literal guard is the hard part — keep it narrow and grammar-aware**
  (L-13, and the false positives that cost CRM-25 and CRM-29 a pass each).
  Scan only `web/src/pages/**` and `web/src/features/**` — not `shared/ui`,
  whose primitives take text as props, and not test files. Judge **JSX text
  nodes and the props that render text** (`aria-label`, `placeholder`,
  `title`, `alt`), not every string in the file: an import path, a className,
  a route, a test id and a `type="email"` are all strings a user never reads.
  Say in the plan exactly which productions count.
- **Prove it fails (L-16).** Add a literal to a page, watch the guard name the
  file and the line, revert. Same for the key-set gap.
- **No new dependency.** No i18next, no formatjs. The reader is fifty lines
  and already works; a library here would replace something that fits with
  something that has opinions about routing and pluralisation this project
  has not needed yet. Say so in the plan so a later story does not re-litigate.
- Vitest 4, Testing Library, and the harness CRM-26 shipped
  (`web/src/testing/render.tsx` — `renderWithProviders(ui, { language: 'ar' })`
  already renders in Arabic). 30 web tests pass; the API's 82 are untouched.
- Read `.squad/plan-lessons.md` (16 lessons).
- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

## Out of scope

- What this story explicitly does **not** cover:
- Switching language at run time, and remembering the choice — LANGUAGES-2-WEB.
- Dates, numbers and durations per locale — LANGUAGES-3-WEB.
- A repo-wide missing-key check across all three roots — LANGUAGES-4-ALL.
  This story makes a missing key a type error in the web root; that story
  makes it a check everywhere.
- Anything Android — the root is built in sprint 10 (LANGUAGES-1-MOB).
- Translating the existing Arabic properly. The wording is provisional and a
  translator revises it; this story is about where strings live, not how good
  they are.
