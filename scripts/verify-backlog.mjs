#!/usr/bin/env node
// Checks backlog.txt against rules.txt and against itself.
// Exists because the first attempt carried nine shipped stories marked as
// scheduled, and the only check read a file that agreed with itself.

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const LAYERS = ['API', 'WEB', 'MOB', 'ALL']
const ACTORS = ['system', 'agent', 'admin', 'customer', 'any', 'developer', 'client']
const VELOCITY = 36, BAND = 0.25
const fail = [], warn = []

const lines = (f) => readFileSync(join(HERE, f), 'utf8').split('\n')
  .map((text, i) => ({ text: text.trim(), n: i + 1 }))
  .filter((l) => l.text && !l.text.startsWith('#'))

// rules.txt
const rules = new Map()
for (const { text, n } of lines('rules.txt')) {
  const m = text.match(/^RULE\s+(\S+)\s*\|\s*([^|]+)\|\s*(.+)$/)
  if (!m) { fail.push(`rules.txt:${n} does not parse`); continue }
  if (rules.has(m[1])) fail.push(`rules.txt:${n} ${m[1]} defined twice`)
  rules.set(m[1], { text: m[3].trim(), owners: [] })
}

// backlog.txt
const features = [], units = new Map()   // expanded id -> unit
let cur = null
for (const { text, n } of lines('backlog.txt')) {
  if (text.startsWith('FEATURE ')) {
    const m = text.match(/^FEATURE\s+([a-z0-9-]+)\|([A-Z]{2,4})\|([^|]+)\|(.+)$/)
    if (!m) { fail.push(`backlog.txt:${n} FEATURE does not parse`); continue }
    cur = { slug: m[1], prefix: m[2], name: m[3].trim(), blurb: m[4].trim(), stories: [] }
    if (features.some((f) => f.slug === cur.slug)) fail.push(`backlog.txt:${n} slug ${cur.slug} used twice`)
    if (features.some((f) => f.prefix === cur.prefix)) fail.push(`backlog.txt:${n} prefix ${cur.prefix} used twice`)
    features.push(cur); continue
  }
  if (!text.startsWith('STORY ')) { fail.push(`backlog.txt:${n} neither FEATURE nor STORY`); continue }
  if (!cur) { fail.push(`backlog.txt:${n} STORY before any FEATURE`); continue }
  const p = text.replace(/^STORY\s+/, '').split('|').map((s) => s.trim())
  if (p.length !== 7) { fail.push(`backlog.txt:${n} STORY has ${p.length} fields, not 7`); continue }
  const [num, slug, actor, title, layerSpec, ruleList, needList] = p
  if (!/^\d+$/.test(num)) fail.push(`backlog.txt:${n} "${num}" is not a number`)
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail.push(`backlog.txt:${n} slug "${slug}" is not kebab-case`)
  if (slug.split('-').length > 4) warn.push(`backlog.txt:${n} slug "${slug}" is over four words`)
  if (!ACTORS.includes(actor)) fail.push(`backlog.txt:${n} actor "${actor}" unknown`)
  if (cur.stories.some((s) => s.num === num)) fail.push(`backlog.txt:${n} ${cur.prefix}-${num} defined twice`)
  if (cur.stories.some((s) => s.slug === slug)) fail.push(`backlog.txt:${n} slug "${slug}" reused inside ${cur.slug}`)
  const story = { num, slug, actor, title, n, feature: cur, layers: [] }
  for (const part of layerSpec.split(',').map((s) => s.trim())) {
    const lm = part.match(/^(API|WEB|MOB|ALL):(\d+):(\d+)$/)
    if (!lm) { fail.push(`backlog.txt:${n} layer spec "${part}" is not LAYER:block:pts`); continue }
    const id = `${cur.slug.toUpperCase()}-${num}-${lm[1]}`
    if (units.has(id)) fail.push(`backlog.txt:${n} ${id} expands twice`)
    const u = { id, story, layer: lm[1], block: +lm[2], pts: +lm[3], rules: [], needs: [] }
    units.set(id, u); story.layers.push(u)
  }
  const rl = ruleList === '-' ? [] : ruleList.split(/\s+/)
  const nl = needList === '-' ? [] : needList.split(/\s+/)
  for (const u of story.layers) { u.rules = rl; u.needs = nl }
  for (const r of rl) {
    if (!rules.has(r)) fail.push(`backlog.txt:${n} cites ${r}, which rules.txt does not define`)
    else rules.get(r).owners.push(`${cur.slug.toUpperCase()}-${num}`)
  }
  cur.stories.push(story)
}

// needs are written with the feature prefix (plumbing); ids are the slug in
// full. Normalise the needs into the id namespace before any check, so the
// check compares one namespace to itself — with raw needs every lookup missed
// and the whole backlog failed as "does not exist".
const prefixToSlug = new Map(features.map((f) => [f.prefix, f.slug.toUpperCase()]))
for (const u of units.values()) {
  u.needs = u.needs.map((need) => {
    const m = need.match(/^([A-Z]{2,4})-(\d+-(?:API|WEB|MOB|ALL))$/)
    return m && prefixToSlug.has(m[1]) ? `${prefixToSlug.get(m[1])}-${m[2]}` : need
  })
}

// needs: exist, and never point forward in time
for (const u of units.values()) for (const need of u.needs) {
  const dep = units.get(need)
  if (!dep) { fail.push(`${u.id} needs ${need}, which does not exist`); continue }
  if (dep.block > u.block) fail.push(`${u.id} (block ${u.block}) needs ${need} (block ${dep.block}) — a dependency on the future`)
}

// cycles
const state = new Map()
const walk = (id, trail) => {
  if (state.get(id) === 'done') return
  if (state.get(id) === 'open') { fail.push(`cycle: ${[...trail, id].join(' -> ')}`); return }
  state.set(id, 'open')
  for (const need of units.get(id)?.needs ?? []) if (units.has(need)) walk(need, [...trail, id])
  state.set(id, 'done')
}
for (const id of units.keys()) walk(id, [])

// every rule owned
for (const [id, r] of rules) if (!r.owners.length) fail.push(`rule ${id} has no owning story — "${r.text.slice(0, 55)}…"`)

// blocks: contiguous, and inside the velocity band
const blocks = new Map()
for (const u of units.values()) {
  const b = blocks.get(u.block) ?? { pts: 0, count: 0, roots: new Set() }
  b.pts += u.pts; b.count++; b.roots.add(u.layer); blocks.set(u.block, b)
}
const nums = [...blocks.keys()].sort((a, b) => a - b)
for (let i = 0; i < nums.length; i++) if (nums[i] !== i) { fail.push(`block ${i} is missing — blocks run ${nums.join(',')}`); break }
const lo = Math.round(VELOCITY * (1 - BAND)), hi = Math.round(VELOCITY * (1 + BAND))
for (const [n, b] of [...blocks].sort((a, b) => a[0] - b[0]))
  if (b.pts < lo || b.pts > hi) warn.push(`block ${n} is ${b.pts} points, outside ${lo}–${hi}`)

// a client story with no API behind it — justify or fix
for (const u of units.values()) {
  if (u.layer === 'API' || u.layer === 'ALL') continue
  const hasApi = u.needs.some((d) => units.get(d)?.layer === 'API')
    || u.story.layers.some((l) => l.layer === 'API')
  if (!hasApi) warn.push(`${u.id} is ${u.layer} with no API behind it — client-only on purpose?`)
}

// report
const total = [...units.values()].reduce((a, u) => a + u.pts, 0)
console.log(`\nbacklog — ${features.length} features · ${features.reduce((a, f) => a + f.stories.length, 0)} capabilities · ${units.size} story units · ${total} points\n`)
console.log('  block   pts  units  roots')
for (const [n, b] of [...blocks].sort((a, b) => a[0] - b[0]))
  console.log(`   ${String(n).padStart(2)}   ${String(b.pts).padStart(4)}  ${String(b.count).padStart(5)}  ${[...b.roots].sort().join(' ')}${b.pts < lo || b.pts > hi ? '   <-' : ''}`)
console.log(`\n  rules: ${rules.size} defined, ${[...rules.values()].filter((r) => r.owners.length).length} owned`)
if (warn.length) { console.log(`\n${warn.length} warning(s)`); for (const w of warn) console.log(`  ~ ${w}`) }
if (fail.length) { console.log(`\n${fail.length} failure(s)`); for (const f of fail) console.log(`  x ${f}`); process.exit(1) }
console.log('\nall checks green\n')
