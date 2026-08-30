> **Fetched from jira:** [CRM-39](https://mazen-al-nabarawy.atlassian.net/browse/CRM-39)  
> *Fetched 2026-08-28T18:00:15.444Z. Edit the sections below as needed; the planner reads this file verbatim.*


## Source — work item (from tracker)

**Title:** LANGUAGES-3-WEB agent — dates and numbers read the way my locale writes them  
**Type:** Story  
**Status:** To Do  
**Labels:** agent, languages, pts-3, sprint-2, web

### Description

agent — dates and numbers read the way my locale writes them

Story folder: .squad/stories/languages/LANGUAGES-3-WEB-locale-formats/

Rules this story owns:

	BR-3 — Time is UTC in storage, the reader's locale on display.

Cannot ship before: LANGUAGES-2-WEB

Points: 3 · Sprint: 2 · Layer: WEB

### Attachments

None.

---
# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/languages/CRM-39/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):**
- **Feature slug (folder under `plans/`):** `languages`

## Tracker (metadata only)

- **Tracker type:** `jira`
- **Work item id:** `CRM-39` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Story`
- **Status:** `To Do`
- **Assignee:** ``
- **Labels:** `agent, languages, pts-3, sprint-2, web`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
LANGUAGES-3-WEB agent — dates and numbers read the way my locale writes them
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
agent — dates and numbers read the way my locale writes them

Story folder: .squad/stories/languages/LANGUAGES-3-WEB-locale-formats/

Rules this story owns:

	BR-3 — Time is UTC in storage, the reader's locale on display.

Cannot ship before: LANGUAGES-2-WEB

Points: 3 · Sprint: 2 · Layer: WEB
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
From scripts/criteria/languages.md, section LANGUAGES-3-WEB:

- Given a date, when it is displayed, then it is formatted for the active
  locale rather than by a hand-written pattern.
- Given a number, when it is displayed in Arabic, then its digits and its
  grouping follow the locale.
- Given a duration, when it is displayed, then it is expressed in the reader's
  language, not as a raw count of minutes.
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

- APIs, screens, services already discussed. Repos/roots: `api, web, android`. Primary language: `JavaScript`. **TypeScript in `web/` only.**

**`Intl` does all three. Do not write a pattern.** The first criterion forbids
a hand-written one in as many words, and `Intl.DateTimeFormat`,
`Intl.NumberFormat` and `Intl.RelativeTimeFormat` are in the platform. Node 26
ships full ICU, so nothing needs a polyfill or a dependency.

**The locale tag is a decision, and the criterion makes it for you.** The app's
`Language` is `'en' | 'ar'`, but those are not Intl locale tags. Measured on
this machine's Node 26:

```
ar                 1,234,567.89     ← Latin digits
ar-EG              ١٬٢٣٤٬٥٦٧٫٨٩     ← Arabic-Indic digits
ar-EG-u-nu-latn    1,234,567.89
```

The criterion says "its **digits** and its grouping follow the locale", so bare
`'ar'` does not satisfy it. Map `'ar' → 'ar-EG'` and `'en' → 'en'` in one place,
and put the measurement above in a comment — the next reader will otherwise
"simplify" the tag back to `'ar'` and quietly break the requirement.

**Durations come from `Intl.RelativeTimeFormat`, not from resource keys.**
`new Intl.RelativeTimeFormat('ar', { numeric: 'auto' }).format(-3, 'hour')`
gives "قبل 3 ساعات". Adding `hoursAgo` / `minutesAgo` keys to both dictionaries
would be re-implementing a pluralisation engine that is already there and does
Arabic's dual and plural forms properly. BR-6 is about strings the product
writes; this is a string the platform writes.

**Do not assert exact formatted strings in tests.** `ar-EG` output carries
invisible RTL marks (`28‏/08‏/2026` has U+200F in it) and ICU data changes
between Node versions, so an exact-match test is a time bomb that will fail on
an upgrade for no reason. Assert the properties the criteria actually name:
that Arabic output uses Arabic-Indic digits, that grouping separators are
present, that the year appears, that English and Arabic differ. Say this in a
comment so nobody "tightens" the assertions later.

**There is no consumer yet, and that must be said out loud.** Nothing in
`web/src` formats a date or a number today. This story ships the formatters and
their proof; it does not invent a screen to display them. A utility with no
caller is acceptable here because the next stories need it — but it must not
pretend otherwise, and the tests are the only thing standing behind it (compare
`verify-architecture.mjs` reporting a rule that read zero files as **not in
force** rather than passing).

**A timestamp arrives as ISO with a `Z`** — `api/src/features/audit/audit.service.js`
stamps `new Date(now() * 1000).toISOString()`. Formatting therefore needs a
zone, and the browser's own is the default. Say whether that is the decision,
because a support desk with SLA clocks may later need one fixed zone for
everybody — that is a later story, but the assumption belongs in a comment now.

## Out of scope

- What this story explicitly does **not** cover:

- **Any screen that displays a date or a number.** None exists. The formatters
  and their tests are the deliverable.
- **The same formatting on Android** — that belongs with the mobile client's
  own language story.
- **A missing-key checker across roots** — `LANGUAGES-4-ALL` (CRM-40).
- **Choosing a fixed display timezone for everybody**, which SLA work may want
  later. Record the assumption; do not build the setting.
- **A relative-time component that ticks.** A formatter is a function; a thing
  that re-renders every minute is a component with a timer, and that is a
  decision nobody has asked for.
- **Currency.** No money is displayed anywhere in this product yet.
- **Changing `Language`, `I18nProvider`, the dictionaries, or any existing
  screen.** The formatters read the active language; they do not change how it
  is chosen.
