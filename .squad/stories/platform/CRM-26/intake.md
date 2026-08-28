> **Fetched from jira:** [CRM-26](https://mazen-al-nabarawy.atlassian.net/browse/CRM-26)  
> *Fetched 2026-08-28T02:32:28.610Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** PLATFORM-11-WEB developer — the web application has a test setup and its first tests  
**Type:** Story  
**Status:** To Do  
**Labels:** developer, platform, pts-5, sprint-1, web

### Description

developer — the web application has a test setup and its first tests

Story folder: .squad/stories/platform/PLATFORM-11-WEB-web-test-setup/

Owns no rule of its own.

Cannot ship before: PLATFORM-9-WEB

Points: 5 · Sprint: 1 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/platform/CRM-26/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `platform`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-26` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `developer, platform, pts-5, sprint-1, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
PLATFORM-11-WEB developer — the web application has a test setup and its first tests
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
developer — the web application has a test setup and its first tests

Story folder: .squad/stories/platform/PLATFORM-11-WEB-web-test-setup/

Owns no rule of its own.

Cannot ship before: PLATFORM-9-WEB

Points: 5 · Sprint: 1 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/platform.md, section ## PLATFORM-11-WEB (lines 146-158) — binding:

- Given the test command, when it runs, then it runs without network access.
- Given a deliberately broken component, when the suite runs, then it fails.
- Given the environment, when a test touches `localStorage`, then it works —
  Node 26 defines a global that throws unless started with a flag, and jsdom's
  returns `undefined`, so the setup provides its own.
- Given a render helper, when a test uses it, then providers, router and
  translations are all in place without the test repeating them.

Out of scope, from the same section: broad coverage. This story proves the
setup; every story after it carries its own tests.
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

- **Sprint 0 is closed and tagged.** `web/` already runs: Vite 8, React 19,
  react-router 7, TypeScript 7, Vitest 4, jsdom, Testing Library. **22 web
  tests pass** across 5 files. This story hardens the harness those tests grew
  into — it does not start one.
- **What exists and must be extended, not replaced:**
  `web/src/testing/setup.ts` already installs a Map-backed `localStorage`
  (a `MemoryStorage` class) for exactly the reason the third criterion names.
  This story keeps that, adds the missing pieces, and takes over the comment
  that currently says PLATFORM-11-WEB will replace the file.
- **The render helper is the headline.** Today `app/routing.test.tsx` renders
  `<App />` (which brings its own BrowserRouter, I18nProvider and AuthProvider),
  while `shared/ui/primitives.test.tsx` renders bare primitives with no
  provider at all. Neither can render a *page* in isolation. Add
  `web/src/testing/render.tsx` exporting a `renderWithProviders(ui, options)`
  that wraps in `MemoryRouter` (with an `initialEntries` option and a `route`
  convenience), `I18nProvider` (with a `language` option so a test can render
  Arabic) and `AuthProvider` (with a `signedIn` option that seeds the stored
  token before mounting). Re-export Testing Library's own API from the same
  module so a test has one import.
- **"Runs without network access" must be proved, not asserted.** The setup
  should replace `globalThis.fetch` with a stub that throws a named error, so
  any test that reaches the network fails loudly and says which call did it.
  A test that genuinely needs a response stubs it per-test with `vi.stubGlobal`
  — which `shared/api/client.test.ts` already does, so that file must keep
  passing unchanged.
- **"A broken component makes the suite fail" is the meta-test.** Do NOT ship a
  permanently failing test. Prove it the way the sprint-0 guards were proved
  (L-16): render a component that throws inside the helper and assert the
  helper surfaces it. State in the plan how it is proved and that nothing red
  is committed.
- **Rewrite the existing tests to use the helper** where they duplicate its
  work — `routing.test.tsx` in particular, which currently pushes to
  `window.history` by hand. Every existing assertion must keep passing; the
  fourth criterion is about tests not repeating provider setup.
- **No new dependency** unless a criterion cannot be met without it. Vitest and
  Testing Library are already installed.
- Read `.squad/plan-lessons.md` (16 lessons). L-15: run `npm run build`, not
  only the suite. L-16: break the guard on purpose before believing it. L-14:
  name packages, not versions.
- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

## Out of scope

- What this story explicitly does **not** cover:
- Broad coverage of anything. The criteria say so explicitly: this story
  proves the setup and every story after it carries its own tests.
- CI running the suite on every push — PLATFORM-13-ALL (CRM-28), which depends
  on this story.
- The backlog and citation checks — PLATFORM-14-ALL (CRM-29).
- The structure check that enforces import direction — PLATFORM-15-ALL.
- Language switching and the full i18n library — LANGUAGES-1-WEB (CRM-35).
  This story only lets a test choose a language the resource files already
  carry.
- Any API test change. `api/`'s 82 tests are untouched by this story.
