> **Fetched from jira:** [CRM-27](https://mazen-al-nabarawy.atlassian.net/browse/CRM-27)  
> *Fetched 2026-08-28T16:33:03.803Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** PLATFORM-12-WEB agent — the desk has one shell: navigation, header, theme  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, platform, pts-5, sprint-2, web

### Description

agent — the desk has one shell: navigation, header, theme

Story folder: .squad/stories/platform/PLATFORM-12-WEB-desk-shell/

Rules this story owns:

	D-1 — No colour literal outside the tokens file, in any root.

Cannot ship before: PLATFORM-10-WEB

Points: 5 · Sprint: 2 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/platform/CRM-27/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `platform`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-27` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, platform, pts-5, sprint-2, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
PLATFORM-12-WEB agent — the desk has one shell: navigation, header, theme
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — the desk has one shell: navigation, header, theme

Story folder: .squad/stories/platform/PLATFORM-12-WEB-desk-shell/

Rules this story owns:

	D-1 — No colour literal outside the tokens file, in any root.

Cannot ship before: PLATFORM-10-WEB

Points: 5 · Sprint: 2 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/platform.md, section PLATFORM-12-WEB:

- Given any desk screen, when it renders, then it renders inside the one shell
  — navigation, header and theme are never re-implemented per screen.
- Given the theme, when it is switched, then the choice survives a reload.
- Given the language, when it changes, then the shell's direction follows it.
- Given the shell, when its styles are read, then every colour is a token
  (D-1).
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`. **This story is TypeScript in `web/` only** — no `api/` and no `android/` file changes.

**The string guard does not look where the shell will live — fix that, or the
shell is the one place hardcoded English is legal.** `web/src/pages/no-hardcoded-strings.test.ts`
line 30 scans `['pages', 'features']`. A shell under `app/` or `shared/ui/` is
outside it, so every label the shell renders — the navigation items, the header,
the theme control — could be a bare English literal and the suite would stay
green. That is L-6 exactly: a check whose scope quietly excludes the surface
you are about to add. Either extend `SCANNED` to cover the shell's directory or
put the shell where the guard already looks, and say which and why. Whichever
is chosen, prove it: add a literal, watch the suite go red, remove it (L-16).

**Direction is already solved — inherit it, do not re-implement it.**
`web/src/shared/i18n/index.tsx` sets `dir` and `lang` on `<html>` in an effect,
and every primitive uses CSS logical properties so nothing mirrors by hand. The
shell must add no direction logic of its own. Note also that `I18nProvider`
takes `language` as a **prop with a default and nothing changes it today** —
switching is `LANGUAGES-2-WEB` (CRM-37), a different story in this same sprint.
So "when the language changes" is satisfied here by the shell not standing in
the way; do not build a language switcher.

**A theme means more token values, never a colour anywhere new.**
`web/src/shared/ui/tokens.css` is the only file allowed to contain a colour, and
`tokens.test.ts` enforces it across the whole of `web/src` — that guard already
covers the shell, unlike the string one. A light/dark theme is therefore a
second block of the same custom properties in that one file, selected by an
attribute on the root element. No component stylesheet gains a colour.

**Persistence: copy the pattern in `web/src/app/auth-context.tsx:20–48`.**
It reads storage synchronously in `useState`'s initialiser so a reload does not
flash the wrong value, and wraps every read and write in `try/catch` because a
private window or blocked site data makes storage throw. A visitor who cannot
store a preference gets the default, never a blank screen. The test harness
(`web/src/testing/setup.ts`) already provides a memory-backed `localStorage`,
so this needs no new test scaffolding.

**Sign-in is not a desk screen.** `SignInPage` has nothing to navigate to and
nobody to greet. Decide deliberately whether the shell wraps every route or only
the authenticated ones — and if the theme control belongs on sign-in too, say
why. Do not wrap everything by accident.

**Do not add a routing library, a state library, or a CSS framework.** The web
package is Vite + React + react-router and the primitives in `shared/ui`. The
shell is composition, not a dependency.

## Out of scope

- What this story explicitly does **not** cover:

- **Switching the language from the interface**, and the RTL flip that follows.
  Owned by `LANGUAGES-2-WEB` (CRM-37).
- **Empty, loading and error states.** Owned by `PLATFORM-16-WEB` (CRM-31),
  which depends on this story. The shell provides the frame; it does not design
  what a screen shows when it has nothing.
- **Dates and numbers formatted by locale.** Owned by `LANGUAGES-3-WEB` (CRM-39).
- **Returning an expired session to sign-in.** Owned by `IDENTITY-3-WEB` (CRM-46).
- **The structure-rule checker** (a layer importing upward, a slice importing a
  sibling). Owned by `PLATFORM-15-ALL` (CRM-30).
- **Any real desk screen.** There is one page behind sign-in today (`home`).
  This story gives it a frame; it does not build a queue, a customer list, or a
  ticket view.
- **Any `api/` or `android/` change, and any new dependency.**
