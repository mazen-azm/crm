#!/usr/bin/env node
// The order the unplanned stories may be planned in, derived from the backlog's
// own `needs` column rather than declared anywhere.
//
// plan-next.sh used to glob `.squad/stories/*/CRM-*/intake.md`, which is
// alphabetical by feature. That is not a wrong order so much as no order at
// all: with sprint 5's twelve intakes on disk it would have planned
// CHANNELS-1-API first, whose whole job is to call a service method that
// CUSTOMERS-5-API has not written yet. A plan written against code that does
// not exist spends its context hunting for it and then invents it — which is
// L-50, and this is the shape of it that a schedule would repeat every five
// hours without anybody watching.
//
// Derived, not listed. A hand-maintained order file is a second statement of
// the dependency graph that agrees with the first until somebody edits one:
// the same defect as a hand-copied list of story ids in a repository that
// cannot check it.
//
// Prints one intake path per line, ready to feed to a loop. --why explains each.

import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readBacklog } from './lib/backlog.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const STORIES = join(ROOT, '.squad/stories')
const PLANS = join(ROOT, '.squad/plans')
const WHY = process.argv.includes('--why')

const { ids, ID_RE } = readBacklog(HERE)
const { needs } = readBacklog(HERE)

// Every plan on disk, by the tracker key in its filename: NN-story-CRM-63.md.
const planned = new Set()
for (const entry of readdirSync(PLANS, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  for (const file of readdirSync(join(PLANS, entry.name))) {
    const key = file.match(/^\d+-story-([A-Z]+-\d+)\.md$/)?.[1]
    if (key) planned.add(key)
  }
}

// Every intake on disk, with the full-name id read out of its own title. The id
// is what the needs graph speaks; the CRM key is what the filenames speak.
const stories = []
for (const feature of readdirSync(STORIES, { withFileTypes: true })) {
  if (!feature.isDirectory()) continue
  for (const key of readdirSync(join(STORIES, feature.name))) {
    const intake = join(STORIES, feature.name, key, 'intake.md')
    if (!existsSync(intake)) continue
    const id = readFileSync(intake, 'utf8').match(ID_RE)?.[0] ?? null
    stories.push({ key, id, feature: feature.name, intake: `.squad/stories/${feature.name}/${key}/intake.md` })
  }
}

const byId = new Map(stories.map((s) => [s.id, s]))
const waiting = stories.filter((s) => !planned.has(s.key))

// A need blocks only while it is itself waiting. A need that is planned is
// available to read; a need with no intake at all is either shipped or out of
// reach, and either way this sort cannot help — it is reported instead of
// silently treated as satisfied.
const unknown = []
const blockers = (s) =>
  (needs.get(s.id) ?? []).filter((need) => {
    const other = byId.get(need)
    if (!other) {
      if (!ids.has(need)) unknown.push(`${s.id} needs ${need}, which backlog.txt does not define`)
      return false
    }
    return !planned.has(other.key)
  })

// Kahn's algorithm, with ties broken by the id so two runs of this print the
// same thing. A cycle would leave stories unemitted; they are printed last with
// a note rather than dropped, because a dropped story is a story nobody plans.
const order = []
const left = new Map(waiting.map((s) => [s.id, s]))
for (;;) {
  const ready = [...left.values()]
    .filter((s) => blockers(s).every((b) => !left.has(b)))
    .sort((a, b) => (a.id ?? '').localeCompare(b.id ?? ''))
  if (ready.length === 0) break
  for (const s of ready) {
    order.push(s)
    left.delete(s.id)
  }
}

// The order is checked against the graph it came from before it is printed.
// A sort that emitted a story ahead of something it waits on would be worse
// than the glob it replaced: the glob is visibly arbitrary, and this would
// look considered. Cheap, and it fails loudly rather than one plan later.
const at = new Map(order.map((s, i) => [s.id, i]))
for (const s of order) {
  for (const need of needs.get(s.id) ?? []) {
    const other = byId.get(need)
    if (!other || planned.has(other.key)) continue
    if (!(at.get(need) < at.get(s.id))) {
      console.error(`! ${s.id} is ordered before ${need}, which it waits on`)
      process.exit(2)
    }
  }
}

for (const line of unknown) console.error(`! ${line}`)
if (left.size > 0) {
  console.error(`! ${left.size} stories wait on each other in a cycle: ${[...left.keys()].join(', ')}`)
}

for (const s of order) {
  if (WHY) {
    const waits = needs.get(s.id) ?? []
    console.log(`${s.key.padEnd(8)} ${(s.id ?? '?').padEnd(22)} ${s.intake}`)
    if (waits.length) console.log(`         waits on ${waits.join(', ')}`)
  } else {
    console.log(s.intake)
  }
}
// A cycle is a backlog defect, not a planning one; say so loudly and let the
// caller plan what it could order.
process.exit(left.size > 0 ? 1 : 0)
