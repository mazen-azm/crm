#!/usr/bin/env node
// The structure rules, enforced from the first feature rather than after nine
// violations. scripts/criteria/platform.md section PLATFORM-15-ALL is the
// contract; each of its eleven bullets is a rule below.
//
// Every rule reports how many files it read, because the last of those bullets
// says a check that passes over an empty set is worse than no check. Four
// rules read nothing today — android/ holds a .gitkeep and the web has no
// entity slices — and they report NOT IN FORCE rather than a green tick that
// means nothing.
//
// On reading source honestly (L-13, and its other edge L-28):
//
//   stripComments runs for every rule. A document — or a comment — explaining
//   a rule contains the words of the rule, and a scan that cannot tell those
//   apart fails on the explanation.
//
//   stripStrings runs for the import matcher ONLY. `import … from '<literal>'`
//   is a fixed grammar, so removing strings first stops a quoted path inside
//   prose from counting. It must never run for the SQL rule: every statement
//   in this codebase lives inside a string or a template literal, so stripping
//   them would delete the subject and leave a rule that cannot fail.
//
// The engine is SQLite through node:sqlite (docs/architecture.md,
// api/src/platform/db/connection.js). The keyword list below is SQLite's.
// There is no ORM and no query builder here.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname, relative, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(p, 'utf8')

function walk(dir, keep, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, keep, out)
    else if (keep(full)) out.push(full)
  }
  return out
}

const rel = (p) => relative(ROOT, p).split('\\').join('/')
const ext = (p, ...suffixes) => suffixes.some((s) => p.endsWith(s))

// ── reading source ───────────────────────────────────────────────────────────
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')

const stripStrings = (src) =>
  src.replace(/`(?:\\.|[^`\\])*`/g, "''").replace(/'(?:\\.|[^'\\])*'/g, "''").replace(/"(?:\\.|[^"\\])*"/g, '""')

const IMPORT = /(?:^|[\s;])(?:import|export)\b[^;]*?\bfrom\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]/g
function readImports(src) {
  const clean = stripStrings(stripComments(src))
  // stripStrings replaced the specifiers too, so match on comment-stripped
  // source but only at positions the clean pass proves are real statements.
  const specifiers = []
  for (const m of stripComments(src).matchAll(IMPORT)) specifiers.push(m[1] ?? m[2])
  void clean
  return specifiers.filter(Boolean)
}

// ── the rules ────────────────────────────────────────────────────────────────
const rules = []
const rule = (id, title, run) => rules.push({ id, title, run })

const resolveRelative = (fromFile, spec) =>
  spec.startsWith('.') ? rel(resolve(dirname(fromFile), spec)) : null

rule('api-feature-internals', 'a feature reaches another feature only through its index', () => {
  const files = walk(join(ROOT, 'api/src/features'), (p) => ext(p, '.js'))
  const findings = []
  for (const file of files) {
    const mine = rel(file).split('/')[3]
    for (const spec of readImports(read(file))) {
      const target = resolveRelative(file, spec)
      if (!target?.startsWith('api/src/features/')) continue
      const theirs = target.split('/')[3]
      if (theirs === mine) continue
      const viaIndex = /\/index\.js$/.test(target) || target === `api/src/features/${theirs}`
      if (!viaIndex) findings.push(`${rel(file)} reaches into ${theirs} at ${target} — only api/src/features/${theirs}/index.js is public`)
    }
  }
  return { files: files.length, findings }
})

rule('api-shared-platform-no-feature', 'shared and platform never import a feature', () => {
  const files = [
    ...walk(join(ROOT, 'api/src/shared'), (p) => ext(p, '.js')),
    ...walk(join(ROOT, 'api/src/platform'), (p) => ext(p, '.js')),
  ]
  const findings = []
  for (const file of files) {
    for (const spec of readImports(read(file))) {
      const target = resolveRelative(file, spec)
      if (target?.startsWith('api/src/features/')) {
        findings.push(`${rel(file)} imports ${target} — the layer below cannot depend on the layer above`)
      }
    }
  }
  return { files: files.length, findings }
})

rule('api-service-repo-no-req-res', 'a service or repository never holds req or res', () => {
  const files = walk(join(ROOT, 'api/src'), (p) => ext(p, '.service.js', '.repository.js'))
  const findings = []
  for (const file of files) {
    const lines = stripStrings(stripComments(read(file))).split('\n')
    lines.forEach((line, i) => {
      if (/\b(req|res)\b/.test(line)) findings.push(`${rel(file)}:${i + 1} names ${/\breq\b/.test(line) ? 'req' : 'res'} — the transport stops at the router`)
    })
  }
  return { files: files.length, findings }
})

// Named, each with its reason. An exemption list without reasons is where a
// check goes to die (L-6).
const SQL_EXEMPT = [
  { path: 'api/src/platform/db/migrations/', why: 'migrations are SQL by definition' },
  { path: 'api/src/platform/db/migrate.js', why: 'the runner reads and executes those files' },
  { path: 'api/src/platform/db/seed.js', why: 'the seed is a second composition root and owns its inserts' },
  { path: 'api/src/features/audit/audit.guard.js', why: 'classifies SQL for a living, so it holds SQL keywords in regexes (L-13)' },
  { matches: (p) => p.endsWith('.test.js'), why: 'tests set up and assert on rows directly' },
]
const sqlExempt = (path) => SQL_EXEMPT.some((e) => (e.path ? path.startsWith(e.path) : e.matches(path)))

// No trailing \b: an earlier version ended the alternation with one and
// SELECT\s+[\w*]\b consumed a single character of the column list, then
// demanded a word boundary in the middle of "id". It matched nothing and the
// rule read 28 files and passed. Found by the failure rehearsal (L-16), which
// is the only reason it was found at all.
const SQL = /\b(SELECT\s+[\w*]|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+TABLE)/i

rule('api-sql-only-in-repository', 'SQL lives in a repository, or in a named exception', () => {
  const files = walk(join(ROOT, 'api/src'), (p) => ext(p, '.js')).filter((p) => !sqlExempt(rel(p)))
  const findings = []
  for (const file of files) {
    if (basename(file).endsWith('.repository.js')) continue
    // Comments stripped, strings KEPT: the SQL is inside them (L-28).
    const source = stripComments(read(file))
    source.split('\n').forEach((line, i) => {
      const hit = SQL.exec(line)
      if (hit) findings.push(`${rel(file)}:${i + 1} ${hit[0].trim()} — SQL belongs in a *.repository.js`)
    })
  }
  return { files: files.length, findings }
})

// The full order docs/architecture.md documents, not just the folders that
// happen to exist. Two of these are empty today, and listing them costs
// nothing — but leaving them out meant a file under web/src/features/ was
// filtered out before it was judged, so the rule silently did not apply to a
// layer the documentation says it applies to. Proved by putting a features/
// file that imports upward in front of the old list and watching it pass.
const WEB_LAYERS = ['app', 'pages', 'features', 'entities', 'shared']

// Violations that exist today, each with what it is and what would end it.
// Deliberately NOT a way to make the check green: an accepted entry is printed
// on every run under its own heading, so it is read rather than forgotten, and
// anything not on this list still fails. Adding an entry is a decision that
// needs the same argument as changing a rule.
//
// This one was found by writing the rule, which is the point of writing it.
// PLATFORM-9-WEB (CRM-24) put the auth context in app/ when app/ was the only
// layer that existed. The fix is to move it to shared/ — a page needs the
// session and shared/ is where a page is allowed to look — and that is a
// change to a shipped story's file, not something PLATFORM-15-ALL may do while
// its own scope says a failing rule is a finding to report. It needs a story.
const ACCEPTED = [
  {
    id: 'web-layer-direction',
    what: 'web/src/pages/sign-in/SignInPage.tsx imports web/src/app/auth-context',
    why: 'the auth context was placed in app/ by CRM-24 before pages existed; moving it to shared/ needs its own story',
    since: '2026-08-28',
  },
]
const accepted = (id, finding) => ACCEPTED.some((a) => a.id === id && finding.startsWith(a.what))
rule('web-layer-direction', 'a web layer never imports the layer above it', () => {
  const files = walk(join(ROOT, 'web/src'), (p) => ext(p, '.ts', '.tsx') && !p.includes('.test.'))
    .filter((p) => WEB_LAYERS.includes(rel(p).split('/')[2]))
  const findings = []
  for (const file of files) {
    const mine = WEB_LAYERS.indexOf(rel(file).split('/')[2])
    for (const spec of readImports(read(file))) {
      const target = resolveRelative(file, spec)
      if (!target?.startsWith('web/src/')) continue
      const theirs = WEB_LAYERS.indexOf(target.split('/')[2])
      if (theirs !== -1 && theirs < mine) {
        findings.push(`${rel(file)} imports ${target} — ${WEB_LAYERS[theirs]} sits above ${WEB_LAYERS[mine]}`)
      }
    }
  }
  return { files: files.length, findings }
})

rule('web-sibling-slice-via-@x', 'two entity slices meet only at @x', () => {
  // docs/architecture.md lines 88-89: a ticket that needs a customer's name
  // declares entities/customer/@x/ticket rather than moving code to shared.
  const files = walk(join(ROOT, 'web/src/entities'), (p) => ext(p, '.ts', '.tsx'))
  const findings = []
  for (const file of files) {
    const mine = rel(file).split('/')[3]
    for (const spec of readImports(read(file))) {
      const target = resolveRelative(file, spec)
      if (!target?.startsWith('web/src/entities/')) continue
      const theirs = target.split('/')[3]
      if (theirs === mine) continue
      if (!target.startsWith(`web/src/entities/${theirs}/@x/${mine}`)) {
        findings.push(`${rel(file)} imports ${target} — ${mine} reaches ${theirs} outside @x`)
      }
    }
  }
  return { files: files.length, findings }
})

rule('android-model-data-no-compose', 'model and data code never imports Compose', () => {
  const files = walk(join(ROOT, 'android'), (p) => p.endsWith('.kt'))
    .filter((p) => /\/(model|data)\//.test(rel(p)))
  const findings = []
  for (const file of files) {
    read(file).split('\n').forEach((line, i) => {
      if (/^\s*import\s+androidx\.compose\./.test(line)) findings.push(`${rel(file)}:${i + 1} imports Compose into ${/\/model\//.test(rel(file)) ? 'model' : 'data'}`)
    })
  }
  return { files: files.length, findings }
})

rule('android-screen-no-navigator', 'a screen takes values, never a navigator', () => {
  const files = walk(join(ROOT, 'android'), (p) => p.endsWith('Screen.kt'))
  const findings = []
  for (const file of files) {
    read(file).split('\n').forEach((line, i) => {
      if (/\b(Navigator|NavController|NavHostController)\b/.test(line)) findings.push(`${rel(file)}:${i + 1} takes a navigator — a screen takes plain values`)
    })
  }
  return { files: files.length, findings }
})

rule('package-scripts-name-real-files', 'a package script names a file that exists', () => {
  const manifests = ['api/package.json', 'web/package.json'].filter((p) => existsSync(join(ROOT, p)))
  const findings = []
  for (const manifest of manifests) {
    // Resolved against the PACKAGE's directory: api/package.json runs
    // `node … src/server.js`, which is api/src/server.js. From the repository
    // root every script in both packages would read as missing.
    const base = join(ROOT, dirname(manifest))
    const { scripts = {} } = JSON.parse(read(join(ROOT, manifest)))
    for (const [name, command] of Object.entries(scripts)) {
      for (const token of String(command).split(/\s+/)) {
        if (token.startsWith('-')) continue          // a flag, not a path
        if (!/\.(js|mjs|cjs|ts|tsx|sh)$/.test(token)) continue
        if (!existsSync(join(base, token))) findings.push(`${manifest} script "${name}" names ${token}, which does not exist`)
      }
    }
  }
  return { files: manifests.length, findings }
})

rule('env-example-vars-are-read', 'every variable .env.example declares is read', () => {
  const examples = walk(ROOT, (p) => basename(p) === '.env.example')
  const findings = []
  for (const file of examples) {
    const root = rel(file).split('/')[0]
    const sources = walk(join(ROOT, root), (p) => ext(p, '.js', '.mjs', '.ts', '.tsx', '.kt'))
      .map((p) => read(p)).join('\n')
    read(file).split('\n').forEach((line, i) => {
      const key = /^\s*([A-Z][A-Z0-9_]*)\s*=/.exec(line)?.[1]      // a commented key is not declared
      if (!key) return
      if (!sources.includes(`process.env.${key}`) && !sources.includes(`System.getenv("${key}")`)) {
        findings.push(`${rel(file)}:${i + 1} declares ${key}, which nothing in ${root}/ reads`)
      }
    })
  }
  return { files: examples.length, findings }
})

// ── report ───────────────────────────────────────────────────────────────────
let failed = 0, dormant = [], totalFiles = 0
console.log('\nverify-architecture — scripts/criteria/platform.md PLATFORM-15-ALL\n')
const carried = []
for (const { id, title, run } of rules) {
  const { files, findings } = run()
  totalFiles += files
  const live = findings.filter((f) => !accepted(id, f))
  for (const f of findings) if (accepted(id, f)) carried.push(`${id}: ${f}`)
  const verdict = files === 0 ? 'n/i' : live.length ? 'FAIL' : 'pass'
  if (files === 0) dormant.push(`${id} — ${title}`)
  if (live.length) failed += 1
  console.log(`  [${verdict.padEnd(4)}] ${id.padEnd(32)} files=${String(files).padStart(4)}  findings=${live.length}`)
  for (const f of live) console.log(`           x ${f}`)
}

console.log(`\narchitecture — ${rules.length} rules · ${rules.length - dormant.length} in force · ${dormant.length} not in force · read ${totalFiles} files\n`)

if (dormant.length) {
  console.log('NOT IN FORCE (0 files read):')
  for (const d of dormant) console.log(`  · ${d}`)
  console.log('\nA rule that reads nothing is not passing, it is dormant — a check that')
  console.log('passes over an empty set is worse than no check (criteria line 195).\n')
}

if (carried.length) {
  console.log('CARRIED (known, accepted, still wrong):')
  for (const c of carried) console.log(`  · ${c}`)
  for (const a of ACCEPTED) console.log(`    since ${a.since} — ${a.why}`)
  console.log('')
}

if (failed) { console.log(`${failed} rule(s) failed\n`); process.exit(1) }
console.log('all architecture rules green\n')
