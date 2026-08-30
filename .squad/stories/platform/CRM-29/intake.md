> **Fetched from jira:** [CRM-29](https://mazen-al-nabarawy.atlassian.net/browse/CRM-29)  
> *Fetched 2026-08-28T02:39:20.896Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** PLATFORM-14-ALL developer — the backlog, its rules and every cited path are checked by a script  
**Type:** Story  
**Status:** To Do  
**Labels:** developer, platform, pts-5, shared, sprint-1

### Description

developer — the backlog, its rules and every cited path are checked by a script

Story folder: .squad/stories/platform/PLATFORM-14-ALL-backlog-check/

Owns no rule of its own.

Cannot ship before: PLATFORM-1-ALL

Points: 5 · Sprint: 1 · Layer: ALL

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/platform/CRM-29/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `platform`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-29` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `developer, platform, pts-5, shared, sprint-1`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
PLATFORM-14-ALL developer — the backlog, its rules and every cited path are checked by a script
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
developer — the backlog, its rules and every cited path are checked by a script

Story folder: .squad/stories/platform/PLATFORM-14-ALL-backlog-check/

Owns no rule of its own.

Cannot ship before: PLATFORM-1-ALL

Points: 5 · Sprint: 1 · Layer: ALL
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/platform.md, section ## PLATFORM-14-ALL (lines 198-212) — binding:

- Given a feature folder in any root, when it is not in `docs/taxonomy.md`, then
  the check fails.
- Given a slug in the taxonomy that owns code, when its folder is missing, then
  the check fails.
- Given a path cited in any document, when it does not exist and is not declared
  as future work, then the check fails and names the document and the line.
- Given a story id anywhere, when its prefix is not in the taxonomy, then it
  fails.
- Given a story id, when it carries no layer suffix, then it fails.

And the rule every check in this project obeys (docs/architecture.md, the
checks table): every check prints how many files it read. A check that passes
over an empty set is worse than no check.
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

- **What already exists — read all three before writing a line:**
  - `scripts/verify-backlog.mjs` — the house style for a check in this repo:
    plain Node, no dependency, `fail`/`warn` arrays, a report that prints
    counts, `process.exit(1)` on failure. It parses `backlog.txt` and
    `rules.txt`. **Copy its shape**, do not invent a second one.
  - `scripts/verify-plan.mjs` — the newer check. It already parses the backlog
    into feature slugs, prefixes and expanded story ids, already walks
    `.squad/plans/`, and already resolves `file:line` citations inside plans.
    Its citation resolver is the thing this story generalises to `docs/`.
  - `docs/taxonomy.md` — the 15 slugs, in a markdown table.
- **This story is `verify-taxonomy.mjs` plus a docs citation check**, both named
  in `docs/architecture.md`'s checks section. Decide in the plan whether they
  are one script or two, and say why. One script named for what it proves is
  usually better than two that share a parser.
- **"A slug that owns code" is the subtle criterion.** Most of the 15 features
  own no folder yet — sprint 0 built only `platform`. So the check must
  distinguish "this slug has code somewhere" from "this slug is planned", and
  it must not fail simply because `tickets/` does not exist yet. Derive
  ownership from the filesystem (a folder exists in any root) rather than from
  a list; the failure is only in the direction of a folder with no taxonomy
  entry, and a taxonomy entry whose folder **existed and vanished** is not
  detectable without a declaration — say so rather than pretending.
- **"Declared as future work" needs a definition.** Documents legitimately cite
  paths that do not exist yet (`api/src/features/<slug>/…` in
  architecture.md's tree, `scripts/verify-architecture.mjs` in its checks
  table). The plan must define the escape precisely — a placeholder segment
  like `<slug>`, a fenced code block that is a diagram rather than a citation,
  or an explicit marker — and the check must honour it. Get this wrong and the
  check is red forever and gets deleted (L-6).
- **Story ids appear in prose across `docs/`, `.squad/` and `scripts/`.** The
  id checks (prefix in taxonomy, layer suffix present) already exist inside
  `verify-plan.mjs` for plans; this story extends the same rules to documents.
  Reuse the regexes rather than writing a second dialect of them.
- **Prove it fails (L-16).** For each of the five criteria the plan names the
  exact edit that turns the check red and what it must print. The executor
  performs each locally and reverts; nothing red is committed.
- **No dependency.** Plain Node, run with `node scripts/<name>.mjs`, added to
  the repo's own check list the same way `verify-backlog.mjs` is.
- Read `.squad/plan-lessons.md` (16 lessons). L-13 especially: a check that
  reads source or prose must read its grammar — a document explaining a rule
  contains the words of the rule, and this check reads documents for a living.
- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`.

## Out of scope

- What this story explicitly does **not** cover:
- The structure checks — import direction, feature isolation, SQL in
  repositories, Compose imports — PLATFORM-15-ALL. That is a different script
  reading code; this one reads names and citations.
- Running any of it in CI — PLATFORM-13-ALL (CRM-28), which comes after.
- Changing the taxonomy or the backlog. If the check finds a real
  disagreement, fix the source it names; do not edit the check to agree.
- The plan check (`verify-plan.mjs`) — it exists and is not this story's to
  rewrite, only to reuse.
