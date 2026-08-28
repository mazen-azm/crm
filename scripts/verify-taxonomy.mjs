#!/usr/bin/env node
// Checks that every feature folder matches docs/taxonomy.md, in every root.
// Exists because a name that lives in two places is a rename that will forget
// one of them — which is precisely how the first attempt became unreadable.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readBacklog } from './lib/backlog.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const fail = [], warn = []
let filesRead = 0

const backlog = readBacklog(HERE)
filesRead += backlog.filesRead

// docs/taxonomy.md — the names
const taxonomySlugs = new Map()   // slug -> line
{
  const path = join(ROOT, 'docs/taxonomy.md')
  if (!existsSync(path)) fail.push('docs/taxonomy.md does not exist')
  else {
    filesRead++
    readFileSync(path, 'utf8').split('\n').forEach((line, i) => {
      const m = line.match(/^\|\s*`([a-z0-9-]+)`\s*\|/)
      if (m) taxonomySlugs.set(m[1], i + 1)
    })
  }
}

// The feature folders, as they actually exist on disk
const FEATURE_DIRS = [
  ['api', 'api/src/features'],
  ['web', 'web/src/features'],
  ['web', 'web/src/entities'],
]
const found = []

function children(root, rel) {
  const dir = join(ROOT, rel)
  if (!existsSync(dir)) return
  filesRead++
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (!/^[a-z0-9-]+$/.test(entry.name)) {
      fail.push(`${rel}/${entry.name} is not a kebab-case slug`)
      continue
    }
    found.push({ slug: entry.name, root, path: `${rel}/${entry.name}` })
  }
}
for (const [root, rel] of FEATURE_DIRS) children(root, rel)

// Android nests its features under a package path, so the folder named
// `feature` has to be found rather than assumed.
function findAndroidFeatures(dir) {
  if (!existsSync(dir)) return
  filesRead++
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (entry.name === 'feature') children('android', join(dir, entry.name).slice(ROOT.length + 1))
    else findAndroidFeatures(join(dir, entry.name))
  }
}
findAndroidFeatures(join(ROOT, 'android/app/src/main/java'))

// A folder whose name is not in the taxonomy
for (const f of found) {
  if (!taxonomySlugs.has(f.slug)) {
    fail.push(`${f.path} is a feature folder, but "${f.slug}" is not in docs/taxonomy.md`)
  }
}

// A slug that owns code somewhere. A slug owning nothing is planned, not
// broken — most of the fifteen have no folder yet and that is the schedule,
// not a defect.
//
// A folder that existed and then vanished is NOT detectable here: nothing
// declares which roots a slug is expected to occupy. Closing that gap needs an
// "owns" column in the taxonomy, and inventing one now would be a second
// hand-maintained surface — the disease this project is treating.
const owning = new Map()
for (const f of found) owning.set(f.slug, [...(owning.get(f.slug) ?? []), f.root])

// platform is the exception the architecture makes on purpose: its code is
// the layer every feature sits on (api/src/platform, web/src/shared), not a
// folder under features/. Warning that it owns nothing would be wrong on the
// day it owns the most.
const LAYER_SLUGS = new Map([['platform', ['api/src/platform', 'web/src/shared']]])
for (const [slug, paths] of LAYER_SLUGS) {
  if (paths.some((p) => existsSync(join(ROOT, p)))) owning.set(slug, ['layer'])
}

for (const slug of taxonomySlugs.keys()) {
  if (!owning.has(slug)) warn.push(`${slug} owns no folder in any root yet`)
}

// The two files that carry the names must agree with each other.
const backlogSlugs = new Set(backlog.features.map((f) => f.slug))
for (const [slug, line] of taxonomySlugs) {
  if (!backlogSlugs.has(slug)) fail.push(`docs/taxonomy.md:${line} names "${slug}", which scripts/backlog.txt does not define`)
}
for (const f of backlog.features) {
  if (!taxonomySlugs.has(f.slug)) fail.push(`scripts/backlog.txt defines "${f.slug}", which docs/taxonomy.md does not name`)
}

if (filesRead === 0) fail.push('read no files — this check would have passed over an empty set')

const roots = new Set(found.map((f) => f.root))
console.log(`\ntaxonomy — ${taxonomySlugs.size} slugs · ${found.length} feature folders across ${roots.size} root(s) · read ${filesRead} files\n`)
if (warn.length) { console.log(`${warn.length} warning(s)`); for (const w of warn) console.log(`  ~ ${w}`) }
if (fail.length) { console.log(`\n${fail.length} failure(s)`); for (const f of fail) console.log(`  x ${f}`); process.exit(1) }
console.log('all taxonomy checks green\n')
