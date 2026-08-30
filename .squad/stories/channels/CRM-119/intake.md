> **Fetched from jira:** [CRM-119](https://mazen-al-nabarawy.atlassian.net/browse/CRM-119)  
> *Fetched 2026-08-30T02:51:38.918Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** CHANNELS-2-API developer — an unimplemented channel says so rather than failing quietly  
**Type:** Story  
**Status:** To Do  
**Labels:** backend, channels, developer, pts-2, sprint-5

### Description

developer — an unimplemented channel says so rather than failing quietly

Story folder: .squad/stories/channels/CHANNELS-2-API-unbuilt-says-so/

Rules this story owns:

	E-3 — 501 means named and deliberately not built — never 404.

Cannot ship before: CHANNELS-1-API

Points: 2 · Sprint: 5 · Layer: API

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/channels/CRM-119/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `channels`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-119` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `backend, channels, developer, pts-2, sprint-5`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
CHANNELS-2-API developer — an unimplemented channel says so rather than failing quietly
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
developer — an unimplemented channel says so rather than failing quietly

Story folder: .squad/stories/channels/CHANNELS-2-API-unbuilt-says-so/

Rules this story owns:

	E-3 — 501 means named and deliberately not built — never 404.

Cannot ship before: CHANNELS-1-API

Points: 2 · Sprint: 5 · Layer: API
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/channels.md, section CHANNELS-2-API (line 56):

An unimplemented channel says so rather than failing quietly.

*Acceptance criteria*
- Given a channel this system knows about and has decided against — email,
  WhatsApp, SMS — when a request arrives for it, then the answer is 501 and
  the body names the channel (E-3).
- Given a name no channel has, when a request arrives for it, then the answer
  is 404. The two answers are different on purpose: 501 says "we know what you
  mean and it is not built", 404 says "there is no such thing".
- Given the list of known channels, then it lives in one place, and the web
  form is the only entry in it that is implemented.
- Given 501, then it is in the documented catalogue and in the OpenAPI
  document, like every other code the API can send (E-2).

*Out of scope*
- Building any of the named channels. They are named so that deciding against
  them is visible; building one is not this product.
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

**This is the story where a decision is visible in a status code.**
`docs/product-brief.md:118` gives 501 its own row: "Named, and deliberately not
built. A channel this system knows about and has decided against — not a `404`,
which would say 'no such thing'." Rule E-3 says the same. The whole story is
keeping those two answers apart.

**501 is not in the catalogue yet.** `api/src/platform/http/errors.js` holds the
frozen list and `web/src/shared/api/errors.ts` mirrors it — read both before
adding. `scripts/verify-plan.mjs` prints the catalogue it knows in its header,
and rule E-2 lists the codes the API can send; if 501 is added, E-2's line in
`scripts/rules.txt` is now incomplete and should be updated in the same commit.

**The list of known channels lives in one place**, in
`api/src/features/channels/`, with the web form as the only implemented entry.
`docs/product-brief.md:137` names the three that are specified only: email,
WhatsApp, SMS. Take the names from there rather than inventing a fourth.

**The OpenAPI contract test** fails on a code a route can send and the document
does not name.


## Out of scope

- What this story explicitly does **not** cover:

- **Building any named channel.** They are named so the decision against them is
  visible.
- **Any `web/` change.**

