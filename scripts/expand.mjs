import { readFileSync } from 'node:fs'

const LABEL = { API: 'backend', WEB: 'web', MOB: 'mobile', ALL: 'all-roots' }

export function load(path = 'scripts/backlog.txt') {
  const out = []
  let feature = null
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const parts = line.split('|')
    if (!/^\d/.test(parts[0])) { feature = { slug: parts[0], prefix: parts[1], display: parts[2] }; continue }
    const [n, actor, title, layers] = parts
    for (const pair of layers.split(',')) {
      const [layer, block] = pair.split(':')
      out.push({
        id: `${feature.prefix}-${n}-${layer}`,
        feature: feature.slug,
        featureDisplay: feature.display,
        n: Number(n), layer, actor,
        block: Number(block),
        label: LABEL[layer],
        title: `${actor} — ${title}`,
      })
    }
  }
  return out
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const all = load()
  const byLabel = {}, byBlock = {}, byFeature = {}
  for (const s of all) {
    byLabel[s.label] = (byLabel[s.label] ?? 0) + 1
    byBlock[s.block] = (byBlock[s.block] ?? 0) + 1
    byFeature[s.feature] = (byFeature[s.feature] ?? 0) + 1
  }
  console.log(`\n  ${all.length} stories across ${Object.keys(byFeature).length} features\n`)
  console.log('  by tag')
  for (const [k, v] of Object.entries(byLabel).sort((a,b)=>b[1]-a[1])) console.log(`    ${k.padEnd(10)} ${String(v).padStart(3)}`)
  console.log('\n  by block')
  for (const [k, v] of Object.entries(byBlock).sort((a,b)=>a[0]-b[0])) console.log(`    block ${k.padEnd(4)} ${String(v).padStart(3)}`)
  console.log('\n  by feature')
  for (const [k, v] of Object.entries(byFeature).sort((a,b)=>b[1]-a[1])) console.log(`    ${k.padEnd(16)} ${String(v).padStart(3)}`)
}
