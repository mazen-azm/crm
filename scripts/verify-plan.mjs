#!/usr/bin/env node
// Checks a generated plan against .squad/plan-lessons.md — mechanically.
//
// Every check here was a defect a human found in a plan review, one story at a
// time. A lesson that stays prose is re-learned by the next reviewer; a lesson
// that becomes a check is learned once. The gates stay human for judgement —
// scope, and whether the story is the right story — and stop spending their
// attention on things a regular expression can decide.
//
//   node scripts/verify-plan.mjs                 every plan
//   node scripts/verify-plan.mjs <plan-file>     one plan
//
// Jira keys are verified against Jira itself when .squad/secrets.yaml has a
// token (L-8: a key is looked up, never computed). Without one the check warns
// rather than passing silently.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const PLANS = join(ROOT, '.squad/plans')
const STORIES = join(ROOT, '.squad/stories')

// Rule E-2 names the whole catalogue. A plan that promises a status outside it
// promises something the rules forbid — 413 and 501 both arrived this way.
const CATALOGUE = new Set([400, 401, 403, 404, 409, 422, 429, 500])
const ENGINE = /node:sqlite|SQLite|DatabaseSync/
const FOREIGN_DIALECT = /TIMESTAMPTZ|CITEXT|pgcrypto|CREATE EXTENSION|pg_advisory|mongoose|prisma|Sequelize/gi
// Naming a thing in order to forbid it is not doing it: a prohibition, a
// done-criterion asserting absence, and the grep that proves it all read as
// matches. The negation lives anywhere on the line, so the line is the unit.
const NEGATED = /\b(no|not|never|without|forbid\w*|refuse\w*|reject\w*|instead of|must not|do not)\b|NOT|grep/i
// Only a plan that actually writes storage needs the engine named. The bare
// word "database" appears in every out-of-scope list ever written.
const PERSISTENCE = /CREATE TABLE|\bmigrations?\/|\.sql\b|db\.(?:exec|prepare)\(/i

const read = (p) => readFileSync(p, 'utf8')
const fail = [], warn = [], note = []

// ── the backlog is the id authority ──────────────────────────────────────────
const features = [], ids = new Set(), prefixes = new Map()
{
  let cur = null
  for (const raw of read(join(HERE, 'backlog.txt')).split('\n')) {
    const text = raw.trim()
    if (!text || text.startsWith('#')) continue
    const f = text.match(/^FEATURE\s+([a-z0-9-]+)\|([A-Z]{2,4})\|/)
    if (f) {
      cur = { slug: f[1], upper: f[1].toUpperCase(), prefix: f[2] }
      features.push(cur); prefixes.set(f[2], cur.upper); continue
    }
    const s = text.match(/^STORY\s+(\d+)\|([a-z0-9-]+)\|[^|]*\|[^|]*\|([^|]+)\|/)
    if (s && cur) for (const part of s[3].split(',')) {
      const m = part.trim().match(/^(API|WEB|MOB|ALL):/)
      if (m) ids.add(`${cur.upper}-${s[1]}-${m[1]}`)
    }
  }
}
// Longest slug first so KNOWLEDGE-BASE wins over any shorter prefix of it.
const SLUGS = features.map((f) => f.upper).sort((a, b) => b.length - a.length)
// The number part is [A-Za-z0-9]+ rather than \d+ ON PURPOSE. This regex is
// not parsing well-formed ids — it is catching malformed ones, and an id that
// cannot match is an id that is never checked. CRM-81's plan invented
// TICKETS-4B-API alongside TICKETS-4-WEB; the second was caught and the first
// was invisible, because `4B` is not `\d+` so the match never started. A
// recogniser stricter than the thing it is looking for finds only the mistakes
// that were nearly right.
const ID_RE = new RegExp(`\\b(${SLUGS.join('|')})-([A-Za-z0-9]+)-(API|WEB|MOB|ALL)\\b`, 'g')
const ABBREV_RE = new RegExp(`\\b(${[...prefixes.keys()].join('|')})-(\\d+)-(API|WEB|MOB|ALL)\\b`, 'g')

// ── the criteria file must speak the backlog's ids (L-7) ─────────────────────
const criteriaSections = new Map()   // full-name id -> { file, line }
for (const file of readdirSync(join(HERE, 'criteria'))) {
  const path = join(HERE, 'criteria', file)
  read(path).split('\n').forEach((line, i) => {
    const m = line.match(/^##\s+(\S+)\s*$/)
    if (!m) return
    if (!ids.has(m[1])) fail.push(`criteria/${file}:${i + 1} section ${m[1]} is not a story in backlog.txt (L-7)`)
    else criteriaSections.set(m[1], { file: `criteria/${file}`, line: i + 1 })
  })
}

// ── Jira, when it can be reached (L-8) ───────────────────────────────────────
function jiraKeys() {
  const secrets = join(ROOT, '.squad/secrets.yaml')
  if (!existsSync(secrets)) return null
  const text = read(secrets)
  // squad-kit writes the token as a YAML block scalar (`token: >-`), so the
  // value sits on the next line behind an indicator.
  const token = text.match(/token:\s*(?:[|>][-+\d]*)?\s*([A-Za-z0-9_=\-.]{20,})/)?.[1]
  const host = text.match(/host:\s*(\S+)/)?.[1]
  const email = text.match(/email:\s*(\S+)/)?.[1]
  if (!token || !host || !email) return null
  const auth = Buffer.from(`${email}:${token}`).toString('base64')
  const out = execFileSync('curl', ['-s', '--max-time', '20',
    '-H', `Authorization: Basic ${auth}`, '-H', 'Accept: application/json',
    `https://${host}/rest/api/3/search/jql?jql=${encodeURIComponent('project = CRM ORDER BY key ASC')}&fields=summary&maxResults=200`,
  ], { encoding: 'utf8' })
  const map = new Map()   // full-name id -> CRM key
  for (const issue of JSON.parse(out).issues ?? []) {
    const id = issue.fields.summary.match(ID_RE)?.[0]
    if (id) map.set(id, issue.key)
  }
  return map.size ? map : null
}
let KEYS = null
try { KEYS = jiraKeys() } catch { KEYS = null }
if (!KEYS) warn.push('Jira was not reachable — tracker keys in plans were not verified (L-8)')

// ── one plan per story, named with the id's capitals ─────────────────────────
const planFiles = []
for (const entry of readdirSync(PLANS, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue          // .squad/plans/00-index.md is the tool's own
  const feature = entry.name, dir = join(PLANS, feature)
  for (const file of readdirSync(dir)) {
    if (!/^\d{2,}-story-.+\.md$/.test(file)) continue
    planFiles.push({ feature, file, path: join(dir, file) })
  }
}
const byTracker = new Map()
for (const p of planFiles) {
  const m = p.file.match(/^\d{2,}-story-(.+)\.md$/)
  p.tracker = m[1]
  if (p.tracker !== p.tracker.toUpperCase())
    fail.push(`${p.file} lowercases the story id — squad-kit matches it case-sensitively, so the console reads the story as unplanned`)
  const key = p.tracker.toUpperCase()
  if (byTracker.has(key)) fail.push(`${key} has two plan files: ${byTracker.get(key)} and ${p.file} — the executor can attach the wrong one`)
  else byTracker.set(key, p.file)
  p.storyDir = join(STORIES, p.feature, key)
}

// ── check one plan ───────────────────────────────────────────────────────────
function checkPlan(p) {
  const body = read(p.path)
  const at = (i) => body.slice(0, i).split('\n').length          // offset -> line
  // A plan whose Done Criteria are all ticked describes work that shipped. The
  // documents it cited have moved on since; that drift is worth reporting and
  // is not worth blocking on, or the check is red forever and stops being read.
  const shipped = /^- \[x\]/m.test(body) && !/^- \[ \]/m.test(body)
  const bucket = shipped ? warn : fail
  const say = (line, msg) => bucket.push(`${p.file}:${line} ${msg}${shipped ? ' [shipped]' : ''}`)
  const flag = (msg) => bucket.push(`${msg}${shipped ? ' [shipped]' : ''}`)

  // L-21 — the planner writes the world it read as fact. It titles every plan
  // "Story 01" whatever the filename says, and it has claimed to be the first
  // plan in a folder holding three. The heading number is the cheap half to
  // check: it is in the plan, and the truth is in the filename beside it.
  const heading = body.match(/^#\s+Story\s+(\d+)\b/m)
  const fileNN = p.file.match(/^(\d+)-story-/)
  if (heading && fileNN && heading[1] !== fileNN[1]) {
    say(at(body.indexOf(heading[0])), `titles itself "Story ${heading[1]}" but is ${fileNN[1]}- in the filename (L-21)`)
  }

  // L-21, the other half. The heading number is checkable against the filename;
  // so is the planner's habit of announcing it is the first plan in a folder it
  // is not. Both are the same defect — the snapshot the planner read, written
  // down as fact — and this one has shipped twice.
  // Narrow on purpose: the claim is about PLANS in this folder, not about
  // being first at anything. "if this is the first story of sprint 0" is a
  // branch-bootstrap instruction and matched an earlier, looser version of
  // this — and a check that cries wolf gets relaxed until it catches nothing.
  const FIRST = /\bno other plans?\b|\bno existing plans?\b|\bthe first plan\b|\bfirst plan file\b|\bthe first entry in[^\n]{0,40}plans\//i
  for (const [i, line] of body.split('\n').entries()) {
    if (!FIRST.test(line)) continue
    // A plan numbered 01 was plausibly first when it was written, and the
    // folder filling up afterwards is not its fault. Anything else claiming to
    // be first is describing a folder it can see is not empty.
    if (/^0*1-story-/.test(p.file)) continue
    const siblings = readdirSync(dirname(p.path)).filter((f) => /^\d+-story-/.test(f))
    if (siblings.length > 1) {
      say(i + 1, `claims to be the first plan in its folder, which holds ${siblings.length} (L-21)`)
    }
  }

  // L-2 — a plan never names its own file
  const selfIdx = body.indexOf(p.file)
  if (selfIdx !== -1) say(at(selfIdx), `names its own file (L-2)`)

  // L-1 — ids come from the backlog, spelled out in full. Quoting a backlog
  // line verbatim is not a violation when the same line gives the full name:
  // that is the plan showing its source and translating it, which is the rule.
  const lines = body.split('\n')
  for (const m of body.matchAll(ABBREV_RE)) {
    const full = `${prefixes.get(m[1])}-${m[2]}-${m[3]}`
    if (lines[at(m.index) - 1].includes(full)) continue
    say(at(m.index), `cites ${m[0]} — the backlog's prefix column is plumbing, use ${full} (L-1)`)
  }
  for (const m of body.matchAll(ID_RE))
    if (!ids.has(m[0])) say(at(m.index), `cites ${m[0]}, which backlog.txt does not define (L-1)`)

  // L-8 — a tracker key is looked up, never computed
  if (KEYS) for (const m of body.matchAll(new RegExp(`(${SLUGS.join('|')})-(\\d+)-(API|WEB|MOB|ALL)[^\\n]{0,40}?\\((CRM-\\d+)`, 'g'))) {
    const id = `${m[1]}-${m[2]}-${m[3]}`, cited = m[4], real = KEYS.get(id)
    if (real && real !== cited) say(at(m.index), `says ${id} is ${cited}; Jira says ${real} (L-8)`)
  }

  // L-5 — name the engine before planning persistence
  for (const m of body.matchAll(FOREIGN_DIALECT)) {
    if (NEGATED.test(lines[at(m.index) - 1])) continue
    say(at(m.index), `uses ${m[0]} — another engine's dialect (L-5)`)
  }
  if (PERSISTENCE.test(body) && !ENGINE.test(body))
    flag(`${p.file} plans persistence without naming the engine (L-5)`)

  // L-11 — a status outside rule E-2's catalogue is a promise the rules forbid
  const statusCtx = /(?:HttpError\(|status(?:\s+is|:)?\s+|returns?\s+|→\s*|\b)([45]\d{2})\s*(?:\/|\s)\s*[`'"]?([A-Z][A-Z_]{3,})/g
  for (const m of body.matchAll(statusCtx)) {
    const status = Number(m[1])
    if (!CATALOGUE.has(status))
      say(at(m.index), `promises ${status} ${m[2]}, which rule E-2's catalogue does not contain (L-11)`)
  }

  // citations: a line number can only be cited in a file that exists, so these
  // are the paths worth resolving — the ones a plan is about to create never
  // carry one.
  // A path, not a bare filename: "errors.js:22" in prose means the file the
  // reader already has open, and resolving it from the repo root is wrong.
  const cite = /`([\w.-]+(?:\/[\w.-]+)+\.\w+)(?::(\d+))?`(?:\s*(?:\*\*)?lines?\*?\*?\s*(\d+)(?:\s*[–-]\s*(\d+))?)?/g
  for (const m of body.matchAll(cite)) {
    const [, rel, colon, from, to] = m
    const line = colon ?? from
    if (!line) continue
    const abs = join(ROOT, rel)
    if (!existsSync(abs)) { say(at(m.index), `cites ${rel}:${line}, which does not exist`); continue }
    const len = read(abs).split('\n').length
    const last = Number(to ?? line)
    if (last > len) say(at(m.index), `cites ${rel} line ${last}, but the file ends at ${len}`)
  }

  // L-6 — a guard's scope is the surface its rule governs
  for (const line of lines) {
    if (!/whole (?:working )?tree|entire (?:working )?tree|recursively grep the repo/i.test(line)) continue
    if (/\bnot\b|NOT|never|rather than|instead of/.test(line)) continue   // saying it is not whole-tree
    flag(`${p.file} proposes a repo-wide grep — .squad/ names its tools by design, so scope the guard to the code root (L-6)`)
    break
  }

  // L-3 — the branch a story is cut from must exist
  for (const m of body.matchAll(/cut from [`']?(sprint-\d+)[`']?/g)) {
    try { execFileSync('git', ['rev-parse', '--verify', m[1]], { cwd: ROOT, stdio: 'pipe' }) }
    catch { say(at(m.index), `cuts from ${m[1]}, which does not exist (L-3)`) }
  }

  // L-4 — the intake's three sections steer the plan
  const intake = join(p.storyDir, 'intake.md')
  if (!existsSync(intake)) { flag(`${p.file} has no intake at ${p.tracker}/intake.md`); return }
  const it = read(intake)
  for (const [heading, next] of [
    ['## Acceptance criteria', '## Attachments'],
    ['## Technical hints', '## Out of scope'],
    ['## Out of scope', null],
  ]) {
    const start = it.indexOf(heading)
    if (start === -1) { flag(`${p.tracker}/intake.md has no "${heading}" (L-4)`); continue }
    const end = next ? it.indexOf(next, start) : it.length
    const section = it.slice(start + heading.length, end === -1 ? it.length : end)
    const filled = section.split('\n')
      .filter((l) => l.trim() && !/^[*(`|-]*\s*$/.test(l.trim()) && !l.trim().startsWith('*(') && !l.trim().startsWith('<!--'))
    if (filled.length < 2) flag(`${p.tracker}/intake.md "${heading}" is empty — it steers everything (L-4)`)
  }

  // L-7 — the story's own id comes from its intake's Title, and that id must
  // have a criteria section. A plan whose story has no criteria is a plan that
  // invented its own acceptance — which is how CRM-19 nearly shipped.
  const title = it.match(/## Title[\s\S]*?```[\w-]*\s*\n([\s\S]*?)\n```/)?.[1] ?? ''
  const own = title.match(ID_RE)?.[0]
  if (!own) flag(`${p.tracker}/intake.md has no story id in its Title block`)
  else if (!criteriaSections.has(own)) flag(`${own} (${p.tracker}) has no section in scripts/criteria/ — the plan had nothing to derive acceptance from (L-7)`)
  else note.push(`${p.file} → ${own} · criteria ${criteriaSections.get(own).file}:${criteriaSections.get(own).line}`)
}

const only = process.argv[2]
const targets = only ? planFiles.filter((p) => p.path.endsWith(only) || p.file === basename(only)) : planFiles
if (only && !targets.length) { console.error(`no plan matches ${only}`); process.exit(2) }
for (const p of targets) checkPlan(p)

// ── report ───────────────────────────────────────────────────────────────────
console.log(`\nplans — ${targets.length} checked, ${ids.size} story ids known, catalogue ${[...CATALOGUE].join(' ')}`)
console.log(`  Jira keys: ${KEYS ? `${KEYS.size} looked up` : 'not verified'}\n`)
const once = (xs) => [...new Set(xs)]
for (const n of once(note)) console.log(`  · ${n}`)
const warns = once(warn), fails = once(fail)
if (warns.length) { console.log(`\n${warns.length} warning(s)`); for (const w of warns) console.log(`  ~ ${w}`) }
if (fails.length) { console.log(`\n${fails.length} failure(s)`); for (const f of fails) console.log(`  x ${f}`); process.exit(1) }
console.log('\nall plan checks green\n')
