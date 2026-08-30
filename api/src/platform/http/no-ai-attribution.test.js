// The rule in docs/git.md lines 50-56, enforced from inside the suite so it
// fails alongside the code.
//
// It used to read the api root ONLY, and that was not a decision — web/ was
// simply never added when it arrived, so a whole root went unguarded and the
// suite stayed green. Probing found it: the same phrase in an api file failed
// the test and in a web file did not (L-44).
//
// .squad/ is still excluded on purpose — plan headers name the planner model
// by design, because the planning record is itself a scored deliverable — and
// so are the ignored root notes, which are not part of the repository.
// Commit messages are covered by the verification-step grep, which this test
// cannot see. The patterns are assembled, never written out, so this file
// passes its own check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const REPO_ROOT = join(API_ROOT, '..');

// Every root that holds code a reader could open. android/ is named now so the
// rule is written before the code it will read; a root that does not exist yet
// is skipped, never assumed clean.
const ROOTS = ['api', 'web', 'android'].map((r) => join(REPO_ROOT, r));

const PATTERN = new RegExp(
  [
    ['co', 'authored', 'by'].join('-'),
    ['generated', 'with'].join(' '),
    ['cl', 'aude'].join(''),
    ['anthro', 'pic'].join(''),
    ['co', 'pilot'].join(''),
  ].join('|'),
  'i',
);

function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // Build output and history: dist and coverage are generated, and .git
    // cannot be meaningfully read a file at a time.
    if (['node_modules', 'data', 'dist', 'coverage', '.git'].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else yield path;
  }
}

test('no file in any code root mentions AI assistance', () => {
  const self = fileURLToPath(import.meta.url);
  let scanned = 0;
  for (const root of ROOTS) {
    if (!existsSync(root)) continue;
    for (const path of files(root)) {
      if (path === self) continue;
      scanned += 1;
      const text = readFileSync(path, 'utf8');
      assert.equal(PATTERN.test(text), false, `attribution found in ${path}`);
    }
  }
  // A walk that silently reaches nothing passes forever. This is the
  // difference between "nothing was found" and "nothing was looked at" — the
  // failure that let web/ go unguarded in the first place.
  assert.ok(scanned > 100, `only ${scanned} files scanned — the walk is not reaching the roots`);
});
