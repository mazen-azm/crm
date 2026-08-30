// The backlog parser, in one place. verify-taxonomy, verify-docs and (later)
// verify-plan all need the same feature slugs, prefixes and expanded ids, and
// three copies of a regex is three chances for two of them to drift.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export function readBacklog(scriptsDir) {
  const features = [], ids = new Set(), prefixes = new Map()
  const rawNeeds = new Map()   // id -> [ids it waits on, in either spelling]
  let cur = null

  for (const raw of readFileSync(join(scriptsDir, 'backlog.txt'), 'utf8').split('\n')) {
    const text = raw.trim()
    if (!text || text.startsWith('#')) continue

    const f = text.match(/^FEATURE\s+([a-z0-9-]+)\|([A-Z]{2,4})\|/)
    if (f) {
      cur = { slug: f[1], upper: f[1].toUpperCase(), prefix: f[2] }
      features.push(cur); prefixes.set(f[2], cur.upper); continue
    }

    const s = text.match(/^STORY\s+(\d+)\|([a-z0-9-]+)\|[^|]*\|[^|]*\|([^|]+)\|([^|]*)\|([^|]*)$/)
    if (s && cur) {
      // The needs column names other stories with the SHORT prefix
      // (TCK-1-API), while an id is built from the feature's UPPER slug
      // (TICKETS-1-API). Both spellings are kept here so a caller can look up
      // either without knowing which one the file happened to use.
      const needs = s[5].trim() === '-' ? [] : s[5].trim().split(/\s+/)
      for (const part of s[3].split(',')) {
        const m = part.trim().match(/^(API|WEB|MOB|ALL):/)
        if (m) {
          const id = `${cur.upper}-${s[1]}-${m[1]}`
          ids.add(id)
          // A capability with two layers shares one needs list, and the WEB
          // half also waits on its own API half — which the file does not say
          // because it is obvious to a reader and not to a sort.
          const own = m[1] === 'WEB' && /(^|,)API:/.test(s[3])
            ? [`${cur.upper}-${s[1]}-API`]
            : []
          // A needs entry may name one layer: `WEB:POR-3-WEB` is a dependency
          // of the WEB half and not of the API half. Without it the column
          // cannot say the commonest thing there is to say about a two-layer
          // capability — that its screen's control belongs on a screen another
          // story builds — because one list is shared by both halves, and
          // writing it unscoped would claim the API half waits on a screen.
          //
          // CONVERSATION-3-WEB is where this was found: its reply box goes on
          // PORTAL-3-WEB's ticket screen, the sort put it first because nothing
          // said otherwise, and the plan would have been written against a
          // screen that did not exist (L-50).
          const scoped = needs
            .map((need) => {
              const layer = need.match(/^(API|WEB|MOB|ALL):(.+)$/)
              if (!layer) return need
              return layer[1] === m[1] ? layer[2] : null
            })
            .filter(Boolean)
          rawNeeds.set(id, [...scoped, ...own])
        }
      }
    }
  }

  // Longest slug first, so KNOWLEDGE-BASE wins over any shorter prefix of it.
  const SLUGS = features.map((f) => f.upper).sort((a, b) => b.length - a.length)

  // Resolved once the prefix table is complete: a needs entry written as
  // TCK-1-API becomes TICKETS-1-API, so every consumer sees one spelling.
  const expand = (ref) => {
    const m = ref.match(/^([A-Z]{2,4})-(\d+)-(API|WEB|MOB|ALL)$/)
    if (m && prefixes.has(m[1])) return `${prefixes.get(m[1])}-${m[2]}-${m[3]}`
    return ref
  }
  const needs = new Map()
  for (const [id, refs] of rawNeeds) needs.set(id, refs.map(expand))

  return {
    features,
    ids,
    needs,
    prefixes,
    SLUGS,
    ID_RE: new RegExp(`\\b(${SLUGS.join('|')})-(\\d+)-(API|WEB|MOB|ALL)\\b`, 'g'),
    ABBREV_RE: new RegExp(`\\b(${[...prefixes.keys()].join('|')})-(\\d+)-(API|WEB|MOB|ALL)\\b`, 'g'),
    filesRead: 1,
  }
}
