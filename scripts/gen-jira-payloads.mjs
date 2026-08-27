// Emits one JSON line per issue to create, from backlog.txt — the same parse as generate.mjs
import { readFileSync, writeFileSync } from 'node:fs'
const read = (f) => readFileSync(f, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
const rules = new Map()
for (const l of read('rules.txt')) { const m = l.match(/^RULE\s+(\S+)\s*\|[^|]+\|\s*(.+)$/); if (m) rules.set(m[1], m[2].trim()) }
const features = []; let cur = null
for (const l of read('backlog.txt')) {
  if (l.startsWith('FEATURE ')) {
    const m = l.match(/^FEATURE\s+([a-z0-9-]+)\|([A-Z]{2,4})\|([^|]+)\|(.+)$/)
    cur = { slug: m[1], prefix: m[2], name: m[3].trim(), blurb: m[4].trim(), stories: [] }; features.push(cur); continue
  }
  const [num, slug, actor, title, layerSpec, rl, nl] = l.replace(/^STORY\s+/, '').split('|').map((s) => s.trim())
  const st = { num, slug, actor, title, rules: rl === '-' ? [] : rl.split(/\s+/), needs: nl === '-' ? [] : nl.split(/\s+/) }
  st.units = layerSpec.split(',').map((p) => { const [layer, block, pts] = p.trim().split(':'); return { layer, block: +block, pts: +pts } })
  cur.stories.push(st)
}
const out = []
for (const f of features)
  out.push({ kind: 'epic', epicSlug: f.slug, summary: `${f.prefix} — ${f.name}`, description: f.blurb })
for (const f of features) for (const s of f.stories) for (const u of s.units) {
  const id = `${f.prefix}-${s.num}-${u.layer}`
  const folder = `${id}-${s.slug}`
  const desc = [
    `**${s.actor}** — ${s.title}`, '',
    `Story folder: \`.squad/stories/${f.slug}/${folder}/\``, '',
    s.rules.length ? `Rules this story owns:\n${s.rules.map((r) => `- ${r} — ${rules.get(r)}`).join('\n')}` : 'Owns no rule of its own.', '',
    s.needs.length ? `Cannot ship before: ${s.needs.join(', ')}` : 'No dependency.', '',
    `Points: ${u.pts} · Block: ${u.block} · Layer: ${u.layer}`,
  ].join('\n')
  out.push({ kind: 'story', epicSlug: f.slug, summary: `${id} ${s.actor} — ${s.title}`, description: desc,
    labels: [u.layer.toLowerCase(), f.slug, s.actor, `block-${u.block}`], pts: u.pts })
}
writeFileSync('jira-payloads.jsonl', out.map((o) => JSON.stringify(o)).join('\n') + '\n')
console.log(`epics: ${out.filter((o) => o.kind === 'epic').length}  stories: ${out.filter((o) => o.kind === 'story').length}`)
