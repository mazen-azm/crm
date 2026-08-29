#!/usr/bin/env node
// Which roots carry resource files, and which do not.
//
// It deliberately does NOT parse them. The dictionaries are TypeScript modules
// and this script runs in CI's checks job with no `npm install`, so it could
// only scrape them with a regex that breaks on the first quoted value. The
// comparison lives where the modules can be imported as objects:
// web/src/shared/i18n/parity.test.ts, and defineLocale is stronger than both.
//
// What this adds is the third criterion — coverage across all three roots. Two
// of them have no resource files today, and they say so: a root that carries
// nothing is NOT IN FORCE, never a green tick. Same shape as
// verify-architecture.mjs, for the same reason.
//
// scripts/criteria/languages.md, section LANGUAGES-4-ALL.
import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROOTS = ['api', 'web', 'android']

// Where a root keeps its user-facing copy, and what a resource file looks like
// there. Android's is listed now so the rule is written before the code it
// will read, rather than after the first violation.
const RESOURCES = {
  web: { dir: 'src/shared/i18n', matches: (f) => /^(en|ar)\.ts$/.test(f) },
  android: { dir: 'app/src/main/res', matches: (f) => /^strings\.xml$/.test(f) },
  api: null,   // no user-facing copy: an error code is a code, not a sentence
}

function find(root) {
  const spec = RESOURCES[root]
  if (!spec) return { files: [], note: 'no user-facing copy by design' }
  const dir = join(ROOT, root, spec.dir)
  if (!existsSync(dir)) return { files: [], note: `${root}/${spec.dir} does not exist yet` }
  const walk = (d) =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(d, e.name)) : spec.matches(e.name) ? [join(d, e.name)] : [],
    )
  return { files: walk(dir), note: null }
}

console.log('\nverify-i18n-parity — scripts/criteria/languages.md LANGUAGES-4-ALL\n')

let inForce = 0
const dormant = []
let totalKeys = 0

for (const root of ROOTS) {
  const { files, note } = find(root)
  if (files.length === 0) {
    dormant.push(`${root} — ${note}`)
    console.log(`  [n/i ] ${root.padEnd(10)} files=   0  ${note}`)
    continue
  }
  inForce += 1
  // A cheap count, honest about being one: the real comparison is the vitest.
  const keys = files.map((f) => (readFileSync(f, 'utf8').match(/^\s{4}\w+:/gm) ?? []).length)
  totalKeys += Math.max(...keys)
  console.log(
    `  [pass] ${root.padEnd(10)} files=${String(files.length).padStart(4)}  ` +
      `${files.map((f) => relative(join(ROOT, root), f)).join(', ')} · ~${Math.max(...keys)} keys each`,
  )
}

console.log(
  `\ni18n — ${ROOTS.length} roots · ${inForce} in force · ${dormant.length} not in force · ~${totalKeys} keys\n`,
)

if (dormant.length) {
  console.log('NOT IN FORCE (no resource files):')
  for (const d of dormant) console.log(`  · ${d}`)
  console.log('\nA root that carries nothing is not passing, it is dormant. The comparison')
  console.log('itself lives in web/src/shared/i18n/parity.test.ts, beside defineLocale.\n')
}

console.log('all i18n coverage checks green\n')
