> **Fetched from jira:** [CRM-37](https://mazen-al-nabarawy.atlassian.net/browse/CRM-37)  
> *Fetched 2026-08-28T17:48:56.851Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** LANGUAGES-2-WEB agent — switching to Arabic flips the interface without a restart  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, languages, pts-3, sprint-2, web

### Description

agent — switching to Arabic flips the interface without a restart

Story folder: .squad/stories/languages/LANGUAGES-2-WEB-arabic-flip/

Rules this story owns:

	BR-6 — Two languages, always, in resource files, never hardcoded.

Cannot ship before: LANGUAGES-1-WEB

Points: 3 · Sprint: 2 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/languages/CRM-37/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `languages`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-37` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, languages, pts-3, sprint-2, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
LANGUAGES-2-WEB agent — switching to Arabic flips the interface without a restart
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — switching to Arabic flips the interface without a restart

Story folder: .squad/stories/languages/LANGUAGES-2-WEB-arabic-flip/

Rules this story owns:

	BR-6 — Two languages, always, in resource files, never hardcoded.

Cannot ship before: LANGUAGES-1-WEB

Points: 3 · Sprint: 2 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/languages.md, section LANGUAGES-2-WEB:

- Given the interface in English, when the language is switched, then the
  text, the direction and the alignment all change without a reload.
- Given the switch, when the page is reloaded, then the chosen language
  survives.
- Given the flipped interface, when it is read, then nothing is mirrored by a
  second stylesheet — the direction comes from the same rules as the first.
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`. **TypeScript in `web/` only.**

**`ThemeProvider` is the precedent — copy it, do not invent a second shape.**
`web/src/app/theme-context.tsx` (CRM-27) already solves exactly this problem
one story ago: read storage synchronously in `useState`'s initialiser so a
reload does not paint the wrong thing and correct it a frame later, wrap every
storage access in `try/catch` because a private window makes it throw, and fall
back when the stored value is not one of the known options. Language wants all
three, for the same reasons. Two providers that persist a preference should not
read differently.

**`I18nProvider` takes `language` as a prop today and nothing changes it.** It
becomes stateful here. **Keep the prop working as an initial-value override** —
`web/src/testing/render.tsx:42` passes it and a dozen tests depend on it,
including `routing.test.tsx` which asserts `dir === 'rtl'`. A prop that stops
being honoured turns those into a rewrite this story has no business doing.

**The harness mirrors `App.tsx`, and that claim is load-bearing.** CRM-27 broke
every screen test by adding a provider to the app and not to
`web/src/testing/render.tsx`. If this story changes the provider's shape, the
harness changes with it in the same commit.

**The control belongs in the shell's header**, beside the theme control —
`web/src/app/desk-shell/DeskShell.tsx`. The shell exists precisely so that
navigation, header and chrome are not re-implemented per screen. Sign-in is not
inside the shell; decide deliberately whether a signed-out visitor can switch
language, and say why either way.

**Make the third criterion mechanical, and mind the trap in it.** "Nothing is
mirrored by a second stylesheet" is checkable: no stylesheet may contain a
`[dir=` selector, a physical direction property (`margin-left`,
`padding-right`, `border-left`, bare `left:` / `right:`) or `text-align: left |
right`. Nothing in `web/src` violates that today, so the guard is free to add
and it locks in what CRM-25 built.

**But strip comments first.** `web/src/shared/ui/tokens.css` line 73 contains
the string `[dir="rtl"]` inside the comment explaining that such a block is
forbidden. A guard that scans raw text fails on the sentence describing the
rule — that is L-13, and the proof case is already sitting in the tree. Use it
as the test: the guard must pass on today's `tokens.css` and fail on a planted
`[dir="rtl"] { … }` block.

**`<html lang>` changes too, not just `dir`.** The effect in
`web/src/shared/i18n/index.tsx` already sets both; keep them together. A screen
reader that is told the direction but not the language reads Arabic with an
English voice.

## Out of scope

- What this story explicitly does **not** cover:

- **The same switch on Android** — `LANGUAGES-2-MOB` (CRM-38). No `android/`
  change.
- **Dates and numbers formatted by locale** — `LANGUAGES-3-WEB` (CRM-39).
  Switching the language here does not make a date read differently; that is
  its own story and its own set of decisions.
- **A check that a key is missing from one language** — `LANGUAGES-4-ALL`
  (CRM-40). `defineLocale` already fails the build on a missing or extra key;
  making that a standalone script across roots is that story.
- **A third language, or anything that loads a locale at run time.** Both
  dictionaries are imported; that is deliberate and stays.
- **Translating anything new.** Every sentence the interface needs already
  exists in both files. If the switcher needs a label, that is one key per
  language and nothing else.
- **Changing the theme provider, the shell's layout, or any screen's content.**
