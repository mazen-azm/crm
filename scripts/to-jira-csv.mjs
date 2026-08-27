import { load } from './expand.mjs'
import { readFileSync, existsSync } from 'node:fs'

const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`

// criteria live per feature in scripts/criteria/<slug>.md, keyed by story id
const criteria = {}
for (const s of load()) {
  const path = `scripts/criteria/${s.feature}.md`
  if (!existsSync(path)) continue
  const doc = readFileSync(path, 'utf8')
  const block = doc.split(`## ${s.id}`)[1]
  if (block) criteria[s.id] = block.split('\n## ')[0].trim()
}

const stories = load()
const features = [...new Map(stories.map((s) => [s.feature, s])).values()]

const HEAD = ['Issue Type','Issue Key','Summary','Description','Epic Name','Parent','Labels','Labels','Labels','Sprint']
const rows = [HEAD.map(q).join(',')]

for (const f of features) {
  rows.push([
    'Epic', `EPIC-${f.feature.toUpperCase()}`, f.featureDisplay,
    `All work in the ${f.feature} domain. Slug: ${f.feature}. Prefix: ${f.id.split('-')[0]}.`,
    f.featureDisplay, '', f.feature, '', '', '',
  ].map(q).join(','))
}

for (const s of stories) {
  const body = criteria[s.id]
    ? `${criteria[s.id]}`
    : `_Acceptance criteria not written yet._`
  rows.push([
    'Story', s.id, `[${s.layer}] ${s.title}`, body, '',
    `EPIC-${s.feature.toUpperCase()}`,
    s.label, s.feature, `block-${s.block}`, `Block ${s.block}`,
  ].map(q).join(','))
}

console.log(rows.join('\n'))
