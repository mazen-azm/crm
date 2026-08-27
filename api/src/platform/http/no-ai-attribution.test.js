// The rule in docs/git.md lines 50-56, enforced from inside the suite so it
// fails alongside the code. Scope is the api root only, on purpose: .squad/
// plan headers name the planner model by design (the planning record is a
// scored deliverable), and the ignored root notes are not part of the repo.
// Commit messages are covered by the verification-step grep, which this test
// cannot see. The patterns are assembled, never written out, so this file
// passes its own check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

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
    if (entry.name === 'node_modules' || entry.name === 'data') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else yield path;
  }
}

test('no file under api/ mentions AI assistance', () => {
  const self = fileURLToPath(import.meta.url);
  for (const path of files(API_ROOT)) {
    if (path === self) continue;
    const text = readFileSync(path, 'utf8');
    assert.equal(PATTERN.test(text), false, `attribution found in ${path}`);
  }
});
