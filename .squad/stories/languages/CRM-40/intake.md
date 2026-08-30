> **Fetched from jira:** [CRM-40](https://mazen-al-nabarawy.atlassian.net/browse/CRM-40)  
> *Fetched 2026-08-29T00:58:23.276Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** LANGUAGES-4-ALL developer — a key missing from one language fails the build  
**Type:** Story  
**Status:** To Do  
**Labels:** developer, languages, pts-2, shared, sprint-2

### Description

developer — a key missing from one language fails the build

Story folder: .squad/stories/languages/LANGUAGES-4-ALL-missing-key-fails/

Rules this story owns:

	BR-6 — Two languages, always, in resource files, never hardcoded.

Cannot ship before: LANGUAGES-1-WEB

Points: 2 · Sprint: 2 · Layer: ALL

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/languages/CRM-40/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `languages`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-40` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `developer, languages, pts-2, shared, sprint-2`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
LANGUAGES-4-ALL developer — a key missing from one language fails the build
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
developer — a key missing from one language fails the build

Story folder: .squad/stories/languages/LANGUAGES-4-ALL-missing-key-fails/

Rules this story owns:

	BR-6 — Two languages, always, in resource files, never hardcoded.

Cannot ship before: LANGUAGES-1-WEB

Points: 2 · Sprint: 2 · Layer: ALL
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/languages.md, section LANGUAGES-4-ALL:

- Given a key added to one language and not the other, when the check runs,
  then it fails and names the key and the file that lacks it.
- Given the check, when it passes, then it prints how many keys it compared —
  a check that passes over an empty set is worse than no check.
- Given all three roots, when the check runs, then it covers each one that
  carries resource files.
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

**The first criterion is already enforced, and by something stronger than a
script.** `defineLocale` in `web/src/shared/i18n/en.ts` is a generic that
rejects a missing key *and* an extra one, at compile time, understanding
nesting — `npm run build` fails on either. Do **not** make a regex re-scrape of
the same two files the centrepiece of this story: that is L-10, a hand-rolled
scan for an invariant a guard already enforces, and the hand-rolled one will be
the weaker of the two. Say in the new check's header comment which guard is
primary and that this one is a companion.

**What the type genuinely cannot see, and what this story is actually for:**

1. **An empty value.** `switchToDark: ''` typechecks and ships a blank button.
2. **A value identical in both languages** — a key somebody copied across
   instead of translating. Measured today: 28 keys per file, none empty, and
   exactly two identical.

**Those two identical keys are correct, and the check must not "fix" them.**
`shell.switchToArabic` is `'العربية'` in both files and `shell.switchToEnglish`
is `'English'` in both, because the button names the language you would switch
**to**, so it reads the same whichever way round you are — there is already a
comment in both files saying so. An identical-value check with no escape would
fire on them, and the obvious way to make it green is to translate the labels,
which breaks the design. The escape must be **explicit and carry its reason**,
the way `verify-architecture.mjs` carries its known violation: named, printed
on every run, with the date and the why.

**Where it lives decides how robust it can be.** The dictionaries are
TypeScript modules, not JSON. A `scripts/verify-*.mjs` in the CI `checks` job
runs with **no `npm install`**, so it cannot import them and cannot use
`@babel/parser` — it would have to scrape with a regex, which breaks the first
time a value contains a quote or spans a line. A vitest test inside `web/`
imports `en` and `ar` as real objects and compares them exactly. Prefer that,
and say why in the plan. If a root-level script is still wanted for the
"all roots" framing, let it **locate** resource files per root and report
coverage, not parse them.

**Two of the three roots have no resource files.** `api/` has no user-facing
sentences at all — its error codes are codes, not copy, and the sentences for
them live in the web dictionaries. `android/` holds one `.gitkeep`. So those
roots read zero and must report **not in force**, never a green tick — the
shape `verify-architecture.mjs` already established for exactly this.

**Print the count.** The second criterion asks for it in as many words: 28 keys
per file today.

## Out of scope

- What this story explicitly does **not** cover:

- **Replacing `defineLocale`.** It stays, it stays primary, and nothing here
  weakens it.
- **Adding, changing or translating any string.** If the check finds a real
  problem, that is a finding to report — this story does not also fix it.
- **Android or API resource files.** Neither root has any. Writing some to give
  the check something to read would be a fixture pretending to be a feature.
- **A third language, or any run-time locale loading.**
- **Checking that a translation is a *good* translation.** Identical values and
  empty values are mechanical; meaning is not.
- **The mobile equivalent** — `LANGUAGES-1-MOB` (CRM-36) owns resource files on
  Android, and it has not been built.
