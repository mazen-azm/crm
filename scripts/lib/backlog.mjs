// The backlog parser, in one place. verify-taxonomy, verify-docs and (later)
// verify-plan all need the same feature slugs, prefixes and expanded ids, and
// three copies of a regex is three chances for two of them to drift.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export function readBacklog(scriptsDir) {
  const features = [], ids = new Set(), prefixes = new Map()
  let cur = null

  for (const raw of readFileSync(join(scriptsDir, 'backlog.txt'), 'utf8').split('\n')) {
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

  // Longest slug first, so KNOWLEDGE-BASE wins over any shorter prefix of it.
  const SLUGS = features.map((f) => f.upper).sort((a, b) => b.length - a.length)

  return {
    features,
    ids,
    prefixes,
    SLUGS,
    ID_RE: new RegExp(`\\b(${SLUGS.join('|')})-(\\d+)-(API|WEB|MOB|ALL)\\b`, 'g'),
    ABBREV_RE: new RegExp(`\\b(${[...prefixes.keys()].join('|')})-(\\d+)-(API|WEB|MOB|ALL)\\b`, 'g'),
    filesRead: 1,
  }
}
