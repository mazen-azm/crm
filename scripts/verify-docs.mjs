#!/usr/bin/env node
// Checks the paths and story ids that documents cite. A cited path that does
// not exist is a rename that forgot its readers, and an id with no layer
// suffix is a name that cannot be looked up.
//
// Two escapes, both deliberate and both narrow:
//
//   1. A path with a placeholder segment — <slug>, {name}, [id] — is a
//      template, not a citation.
//   2. A path inside a fenced block with no language tag is a diagram. The
//      architecture doc draws its trees that way, and a tree is a picture of
//      a shape, not a claim that every leaf exists.
//
// A real citation that names something not built yet marks itself on the same
// line with (planned), (future) or (not yet).
//
// The grammar matters here more than anywhere: this script reads documents
// that explain rules for a living, and a document explaining a rule contains
// the words of the rule.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readBacklog } from './lib/backlog.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const fail = [], warn = []
let filesRead = 0, citations = 0, storyIds = 0

const backlog = readBacklog(HERE)
filesRead += backlog.filesRead

// CRM is the tracker's key, not a feature prefix; it is legitimate everywhere.
const EXEMPT_PREFIXES = new Set(['CRM'])
const PLACEHOLDER = /[<>{}[\]]|\/SLUG(\/|$)/
const FUTURE = /\((?:planned|future|not yet)\b[^)]*\)/i
// "e.g." marks an illustration. squad-kit's intake template ships a table row
// reading `*(e.g. attachments/flow.png)*`, which is an example of the shape of
// a citation, not one.
const ILLUSTRATION = /\be\.g\./i
// A document written inside a root cites relative to it, the way its reader
// reads it: architecture.md's API section says `platform/db/seed.js` under a
// tree rooted at api/src. Resolve the way a reader would.
const SEARCH_ROOTS = ['', 'api', 'api/src', 'web', 'web/src']
// './errors.js' inside a code block is an import specifier — it resolves
// against the file being written, which is not a place this script stands.
const RELATIVE_IMPORT = /^\.\.?\//

function resolveCited(cited) {
  for (const base of SEARCH_ROOTS) {
    const full = join(ROOT, base, cited)
    if (existsSync(full)) return full
  }
  return null
}
const CITE = /`([\w.-]+(?:\/[\w.-]+)+\.\w+)(?::(\d+))?`(?:\s*(?:\*\*)?lines?\*?\*?\s*(\d+)(?:\s*[–-]\s*(\d+))?)?/g
const ID = /\b([A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*)-(\d+)(?:-(API|WEB|MOB|ALL))?\b/g

function markdownFiles(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) markdownFiles(full, out)
    else if (entry.name.endsWith('.md')) out.push(full)
  }
  return out
}

const documents = [
  ...markdownFiles(join(ROOT, 'docs')),
  ...markdownFiles(join(HERE, 'criteria')),
  ...markdownFiles(join(ROOT, '.squad/stories')),
  ...markdownFiles(join(ROOT, '.squad/plans')),
]

const taxonomySlugs = new Set()
{
  const path = join(ROOT, 'docs/taxonomy.md')
  if (existsSync(path)) {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^\|\s*`([a-z0-9-]+)`\s*\|/)
      if (m) taxonomySlugs.add(m[1].toUpperCase())
    }
  }
}

for (const path of documents) {
  filesRead++
  const rel = relative(ROOT, path)
  // docs/ and scripts/criteria/ are the living documents: they describe what
  // is true now, so a wrong citation there is a failure. .squad/ is the
  // planning record — a shipped plan describes the world on the day it was
  // written, and holding history to today's paths would make this check red
  // forever, which is how a check gets deleted instead of obeyed.
  const isRecord = rel.startsWith('.squad/')
  const report = (message) => (isRecord ? warn : fail).push(message)
  let inFence = false, fenceIsCode = false

  readFileSync(path, 'utf8').split('\n').forEach((line, index) => {
    const at = `${rel}:${index + 1}`

    if (line.trimStart().startsWith('```')) {
      if (inFence) { inFence = false; fenceIsCode = false }
      else { inFence = true; fenceIsCode = line.trim().length > 3 }
      return
    }
    // A fence with no language is a diagram; a fence with one is code, and
    // code that cites a path is citing it.
    const isDiagram = inFence && !fenceIsCode
    if (FUTURE.test(line) || ILLUSTRATION.test(line)) return

    if (!isDiagram) {
      for (const m of line.matchAll(CITE)) {
        const [, cited, colon, from, to] = m
        if (PLACEHOLDER.test(cited) || RELATIVE_IMPORT.test(cited)) continue
        citations++
        const resolved = resolveCited(cited)
        if (!resolved) {
          report(`${at} cites ${cited}, which does not exist`)
          continue
        }
        const lineNumber = colon ?? to ?? from
        if (!lineNumber) continue
        const length = readFileSync(resolved, 'utf8').split('\n').length
        if (Number(lineNumber) > length) report(`${at} cites ${cited} line ${lineNumber}, but the file ends at ${length}`)
      }
    }

    for (const m of line.matchAll(ID)) {
      const [whole, prefix, , layer] = m
      if (EXEMPT_PREFIXES.has(prefix)) continue
      // Only judge things that look like this project's ids: a prefix the
      // taxonomy knows, or the abbreviation of one. Version numbers, dates
      // and HTTP examples are not story ids.
      const known = taxonomySlugs.has(prefix) || backlog.prefixes.has(prefix)
      if (!known) continue
      storyIds++
      // A compressed range — PLATFORM-4/5/6-API — gives every member the one
      // layer written at the end. Each is resolvable, which is what the rule
      // is protecting; splitting them out would be pedantry, not a check.
      const after = line.slice(m.index + whole.length)
      const inRange = !layer && /^(?:\/\d+)*-(?:API|WEB|MOB|ALL)\b/.test(after)

      if (backlog.prefixes.has(prefix)) {
        report(`${at} uses the abbreviated id ${whole}; the taxonomy spells it ${backlog.prefixes.get(prefix)}`)
      } else if (!layer && !inRange) {
        report(`${at} id ${whole} carries no layer suffix (API|WEB|MOB|ALL)`)
      }
    }
  })
}

if (filesRead === 0) fail.push('read no files — this check would have passed over an empty set')

console.log(`\ndocs — ${documents.length} documents · ${citations} citations · ${storyIds} story ids · read ${filesRead} files\n`)
if (warn.length) { console.log(`${warn.length} warning(s)`); for (const w of warn) console.log(`  ~ ${w}`) }
if (fail.length) { console.log(`${fail.length} failure(s)`); for (const f of fail) console.log(`  x ${f}`); process.exit(1) }
console.log('all document checks green\n')
