> **Fetched from jira:** [CRM-31](https://mazen-al-nabarawy.atlassian.net/browse/CRM-31)  
> *Fetched 2026-08-28T17:24:57.376Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** PLATFORM-16-WEB agent — empty, loading and error states are designed, not accidental  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, platform, pts-3, sprint-2, web

### Description

agent — empty, loading and error states are designed, not accidental

Story folder: .squad/stories/platform/PLATFORM-16-WEB-designed-states/

Rules this story owns:

	D-2 — Empty, loading and error states are designed, not accidental.

Cannot ship before: PLATFORM-12-WEB

Points: 3 · Sprint: 2 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/platform/CRM-31/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `platform`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-31` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, platform, pts-3, sprint-2, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
PLATFORM-16-WEB agent — empty, loading and error states are designed, not accidental
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — empty, loading and error states are designed, not accidental

Story folder: .squad/stories/platform/PLATFORM-16-WEB-designed-states/

Rules this story owns:

	D-2 — Empty, loading and error states are designed, not accidental.

Cannot ship before: PLATFORM-12-WEB

Points: 3 · Sprint: 2 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/platform.md, section PLATFORM-16-WEB:

- Given a list with no rows, when it renders, then the empty state says why it
  is empty and offers the next action — not a blank region.
- Given a failed load, when it renders, then the error state shows the
  documented code's meaning and offers retry.
- Given a request in flight, when the screen renders, then the loading state is
  the shared primitive, not a layout jump.
- Given any new screen, when it ships, then all three states exist and the
  review can point at each.
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`. **TypeScript in `web/` only** — no `api/` and no `android/` changes.

**The state machine already exists. Build on it, do not add a second one.**
`web/src/shared/hooks/useRequest.ts:7` is `'idle' | 'loading' | 'success' |
'error'`, and its comment says it is the only place a web screen expresses
loading. The three primitives render *for* those statuses; they do not
introduce a parallel notion of what a screen is doing.

**The per-code message mapper already exists — in the wrong place.**
`web/src/pages/sign-in/SignInPage.tsx` has a local `messageFor(code, t)`
switch. That is the accidental version of this story: the next screen would
write its own, and the two would drift. Lift it into one shared place and have
sign-in use it, without changing what sign-in renders today.

**Make "the documented code's meaning" exhaustive by type, not by good
intentions.** `web/src/shared/api/errors.ts` freezes `ApiErrorCode` as a union
of the eight codes that mirror the API's `DOCUMENTED` catalogue. Type the
message map as `Record<ApiErrorCode, …>` so that adding a ninth code to the
union and forgetting its sentence **fails `tsc -b`**. That is the same
discipline `defineLocale` already uses for missing and extra keys, and it is
the only version of this criterion a person cannot quietly break. Remember
vitest does not typecheck — the proof is `npm run build` (L-15).

**The string guard has a hole here, again.**
`web/src/pages/no-hardcoded-strings.test.ts` scans `['pages', 'features',
'app']` after CRM-27. If these primitives go in `shared/ui/`, their labels are
outside the scan — the same L-6 shape that story just closed. Two honest ways
out: put the components where the guard looks, or extend the guard again. Say
which and why. Note that a primitive taking its text as props has no literals
of its own, so the real question is where the **sentences** live — and the
answer to that is `shared/i18n`, in both languages, which `defineLocale`
already enforces in lockstep.

**"Not a layout jump" is a specific requirement.** A loading state that is
shorter than the content it becomes makes the page move under the reader's
cursor. Reserve the space — a skeleton with the shape of what is coming — and
say in a comment that this is why, so nobody "simplifies" it into a spinner.

**Every colour is still a token.** `tokens.css` is the only file allowed to
hold one and `tokens.test.ts` scans all of `web/src` (D-1). A skeleton's shimmer
is a colour like any other.

**The fourth criterion is a review affordance, not a machine check** — "the
review can point at each". Do not invent a weak guard that pretends to enforce
"every screen has all three states"; a check that cannot really tell is worse
than an honest note. If a genuine mechanical check is possible, argue for it;
otherwise say plainly that the enforcement is the primitives being the easiest
path and the review being able to name them.

## Out of scope

- What this story explicitly does **not** cover:

- **Any real desk screen.** There is one authenticated page today and it has no
  list. This story ships the states and proves them; the screens that use them
  arrive with their own stories.
- **Switching the language** — `LANGUAGES-2-WEB` (CRM-37). The sentences are
  added to both resource files here; choosing between them is that story.
- **Locale-formatted dates and numbers** — `LANGUAGES-3-WEB` (CRM-39).
- **Sending an expired session back to sign-in** — `IDENTITY-3-WEB` (CRM-46).
  A 401 rendered by the error state is not the same thing as a redirect.
- **Changing `useRequest`'s status union, the `ApiError` shape, or the
  `ApiErrorCode` union.** They are the contract this story renders; if one
  looks wrong, that is a finding to report.
- **Moving `auth-context` out of `app/`.** `verify-architecture.mjs` carries
  that violation deliberately and it needs its own story — not this one.
- **Any `api/` or `android/` change, and any new dependency.**
