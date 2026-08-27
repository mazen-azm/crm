# CLAUDE.md — Support Desk

Project-level context for Claude Code inside this repo.
(The learning-workspace map lives in `../../CLAUDE.md`.)

## What this project is

A customer-support CRM built as an assessed learning project. The company brief
(12 areas, from customer management to platform) is the requirement; the
assessment sheet weighs **planning and specification at 40 of 100 points** —
more than the code itself. The real goal is to learn **squad-kit** end to end:
intake → plan → build → verify, with Jira as the tracker.

This is the second attempt. The first (`../support-crm`) shipped 8 sprints and
still runs; it stopped being navigable because one feature carried four names
and three documents described the same backlog with nobody comparing them.
Nothing there was deleted. This repo starts clean with the lessons applied.

## The taxonomy — one name per thing

15 features. The slug is the folder name in `api/src/features/`, in
`.squad/stories/`, in `.squad/plans/`, and (uppercased) in every story id.
**Never abbreviated anywhere** — no `TCK`, no `SLA`, no `PLT`. An abbreviation
is a lookup table the reader has to memorize, and it broke the first attempt.

```
platform        languages       identity        customers       tickets
conversation    service-levels  notifications   channels        portal
reports         audit           knowledge-base  satisfaction    assist
```

There is no feature named backend, web or mobile — those are **layers**.
A folder named after a layer puts "sign in on a phone" next to "read a report
on a phone", which share nothing but a screen size.

## The id — reads without opening anything

```
TICKETS-2-WEB-queue-filter-sort
│       │ │   └── what it does (2–4 words, kebab-case)
│       │ └── layer: API · WEB · MOB · ALL
│       └── number inside the feature
└── the feature, spelled out
```

The same id runs through everything: the Jira summary starts with it, the
story folder is named by it, the plan file carries it, the branch is named
after it, the commit cites it. One name, seven places, zero translation.

## The backlog

- **Source of truth:** `scripts/backlog.txt` — 15 features, 90 capabilities,
  138 story units, 480 points. Everything else is generated; nothing derived
  is ever edited by hand.
- **Rules:** `scripts/rules.txt` — 31 rules from the product brief, each owned
  by at least one story. A rule nobody owns fails the check.
- **Check:** `node scripts/verify-backlog.mjs` — id shape, duplicates,
  dependencies exist and never point at a later sprint, no cycles, sprint
  balance against the measured velocity (36 ± 25%), rule ownership.
- **Generate:** `node scripts/generate.mjs` → `BACKLOG.md` + `jira-import.csv`.

13 sprints (0–12), all inside 33–43 points. Sprint 10 is the whole mobile
client, deliberately one sprint after splitting it produced two thin ones.

## Jira

- Site: `mazen-al-nabarawy.atlassian.net` (personal, not the company instance)
- Project: **CRM** — 153 issues: 15 epics (CRM-1..15, one per feature, full
  name as the summary) and 138 stories (CRM-16..153).
- Every story: summary starts with the full id · labels carry the layer
  (`backend` / `web` / `mobile` / `shared`), the feature slug, the actor,
  `sprint-N` and `pts-N` · parent is the feature's epic · description carries
  the owned rules, the dependencies, and the squad-kit story folder.
- Verified 2026-08-27 by reading back from Jira: all 153 keys with no gap,
  zero stories missing labels or parent, layer counts 68/54/10/6 and all 13
  sprint counts exactly matching `backlog.txt`, zero old abbreviations.
- The board shows stories only; epics appear in Timeline or Group-by-Epic.
- Sprints are labels (`sprint-N`) because the project is a team-managed Kanban.

## The loop — every story goes through it

```
1. squad new-story <feature> --id CRM-N     intake pulled from Jira
2. /squad-plan <intake>                      inside Claude Code, not the console
3. fresh scoped session, only the plan file  build
4. tests + checks + commit                   close, test count must go up
```

The console (0.12.4) browses stories, plans and config well, but its drafter
fails on `read_file` — plan from inside Claude Code. First story to run the
whole loop: **CRM-16** (`PLATFORM-1-ALL-repo-conventions`) — nothing depends
on it and it depends on nothing.

## Rules that were paid for once already

- **One name per thing.** Not abbreviated in one place and spelled out in
  another — that includes display names, not just ids.
- **State is derived, never declared.** No hand-written "done" column anywhere;
  git tags and the plans' checkboxes are the record.
- **A check that reads one source proves only that the source agrees with
  itself.** Verify Jira against `backlog.txt`, the filesystem against the
  taxonomy, the plans against the code.
- **Do not plan before the code exists.** A planner pointed at an empty folder
  invents paths.
- **A decision written down is a decision; one that is not is an omission.**
  Eleven brief items are deliberately not built (email/WhatsApp/SMS/chat
  channels, chatbot, auto-categorisation, ERP, multi-branch, branding,
  auto-assignment, attachments) — each recorded, none silently dropped.

## Decisions

- **Backend:** Node + Express + SQLite. Same as the first attempt; known, fast
  tests on `:memory:`.
- **SLA targets are fixed by the seed**, by decision — no admin screen for them
  (recorded in `rules.txt` S-2).
- **Design is stories, not vibes:** tokens file (`PLATFORM-10-WEB`), one shell
  (`PLATFORM-12-WEB`), designed states (`PLATFORM-16-WEB`), the same palette on
  mobile (`PLATFORM-18-MOB`). Rules D-1 (no colour literal outside the tokens
  file) and D-2 (states are designed) are checked, not hoped for.
- **Open — web framework:** the backlog says React; Vite keeps the "every rule
  lives in the API" principle cleaner than Next's server components. Decide
  before `PLATFORM-9-WEB`.
- **Open — mobile:** the backlog says Compose (`PLATFORM-18-MOB`). KMP was
  discussed; if wanted, it becomes a later story proving the layer-swap rule,
  not a sprint-0 prerequisite.

## No AI attribution

No `Co-Authored-By:` trailers, no "Claude" in a commit subject or body, no AI
sections in the README, no `CLAUDE.md` named in `.gitignore` (use `/*.md` +
`!/README.md`). Removing it from the tip is not enough — it must never enter
history.
