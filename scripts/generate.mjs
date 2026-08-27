#!/usr/bin/env node
// backlog.txt -> BACKLOG.md + jira-import.csv. Generated; never edited by hand.
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, '..')
const read = (f) => readFileSync(join(HERE, f), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))

const rules = new Map()
for (const l of read('rules.txt')) { const m = l.match(/^RULE\s+(\S+)\s*\|[^|]+\|\s*(.+)$/); if (m) rules.set(m[1], m[2].trim()) }

const features = []; let cur = null
for (const l of read('backlog.txt')) {
  if (l.startsWith('FEATURE ')) {
    const m = l.match(/^FEATURE\s+([a-z0-9-]+)\|([A-Z]{2,4})\|([^|]+)\|(.+)$/)
    cur = { slug: m[1], prefix: m[2], name: m[3].trim(), blurb: m[4].trim(), stories: [] }; features.push(cur); continue
  }
  const [num, slug, actor, title, layerSpec, rl, nl] = l.replace(/^STORY\s+/, '').split('|').map((s) => s.trim())
  const st = { num, slug, actor, title, rules: rl === '-' ? [] : rl.split(/\s+/), needs: nl === '-' ? [] : nl.split(/\s+/), units: [] }
  for (const part of layerSpec.split(',')) {
    const [layer, block, pts] = part.trim().split(':')
    st.units.push({ id: `${cur.prefix}-${num}-${layer}`, folder: `${cur.prefix}-${num}-${layer}-${slug}`, layer, block: +block, pts: +pts, story: st, feature: cur })
  }
  cur.stories.push(st)
}
const units = features.flatMap((f) => f.stories.flatMap((s) => s.units))

// jira-import.csv
const q = (s) => `"${String(s).replace(/"/g, '""')}"`
const rows = [['Issue Type', 'Summary', 'Description', 'Epic Name', 'Epic Link', 'Story Points', 'Sprint', 'Labels', 'Labels', 'Labels'].map(q).join(',')]
for (const f of features) rows.push(['Epic', `${f.prefix} — ${f.name}`, f.blurb, f.name, '', '', '', f.slug, '', ''].map(q).join(','))
for (const u of units) {
  const s = u.story
  const desc = [
    `*${s.actor}* — ${s.title}`, '',
    `Story folder: .squad/stories/${u.feature.slug}/${u.folder}/`, '',
    s.rules.length ? `Rules this story owns:\n${s.rules.map((r) => `- ${r} — ${rules.get(r)}`).join('\n')}` : 'Owns no rule of its own.', '',
    s.needs.length ? `Cannot ship before: ${s.needs.join(', ')}` : 'No dependency.',
  ].join('\n')
  rows.push(['Story', `${u.id} ${s.actor} — ${s.title}`, desc, '', u.feature.name, u.pts, `Block ${u.block}`, u.layer.toLowerCase(), u.feature.slug, s.actor].map(q).join(','))
}
writeFileSync(join(OUT, 'jira-import.csv'), rows.join('\n') + '\n')

// BACKLOG.md
const blocks = [...new Set(units.map((u) => u.block))].sort((a, b) => a - b)
const pts = (l) => l.reduce((a, u) => a + u.pts, 0)
const md = ['# The backlog', '', 'Generated from `scripts/backlog.txt` by `scripts/generate.mjs`. Never edited by hand.', '',
  `**${features.length} features · ${features.reduce((a, f) => a + f.stories.length, 0)} capabilities · ${units.length} story units · ${pts(units)} points · ${blocks.length} blocks**`, '',
  'An id reads feature–number–layer; the folder adds what it does: `TCK-2-WEB-queue-filter-sort`.', '',
  '## Blocks', '', '| Block | Pts | Units | Roots | Features touched |', '|---|---|---|---|---|']
for (const b of blocks) {
  const inB = units.filter((u) => u.block === b)
  md.push(`| ${b} | ${pts(inB)} | ${inB.length} | ${[...new Set(inB.map((u) => u.layer))].sort().join(' ')} | ${[...new Set(inB.map((u) => u.feature.name))].join(', ')} |`)
}
md.push('', '## Features', '')
for (const f of features) {
  md.push(`### ${f.name} · \`${f.slug}\` · ${f.prefix}`, '', f.blurb, '', '| Unit | Folder | Actor | Title | Block | Pts | Rules | Needs |', '|---|---|---|---|---|---|---|---|')
  for (const s of f.stories) for (const u of s.units)
    md.push(`| \`${u.id}\` | \`${u.folder}\` | ${s.actor} | ${s.title} | ${u.block} | ${u.pts} | ${s.rules.join(' ') || '—'} | ${s.needs.map((x) => `\`${x}\``).join(' ') || '—'} |`)
  md.push('')
}
md.push('## Rules and their owners', '', '| Rule | Owned by |', '|---|---|')
for (const [id] of rules) {
  const owners = features.flatMap((f) => f.stories.filter((s) => s.rules.includes(id)).map((s) => `\`${f.prefix}-${s.num}\``))
  md.push(`| \`${id}\` | ${owners.join(' ')} |`)
}
md.push('')
writeFileSync(join(OUT, 'BACKLOG.md'), md.join('\n'))
console.log(`wrote jira-import.csv (${features.length} epics + ${units.length} stories) and BACKLOG.md`)
