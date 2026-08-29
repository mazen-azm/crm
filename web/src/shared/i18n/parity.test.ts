// The i18n parity check — a companion to defineLocale, not a replacement.
//
// PRIMARY GUARD: `defineLocale` (en.ts:81, called by ar.ts:6) rejects a missing
// key and an extra one, at compile time, understanding nesting. `npm run build`
// fails on either. Nothing here weakens it, and a regex re-scrape of the same
// two files would have been a hand-rolled copy of a guard that already exists
// and is stronger (L-10).
//
// This covers the two things a type cannot see:
//
//   an empty value — `switchToDark: ''` typechecks and ships a blank button;
//   a value identical in both files — a key copied instead of translated.
//
// scripts/criteria/languages.md, section LANGUAGES-4-ALL.
import { expect, test } from 'vitest';

import { en } from './en';
import { ar } from './ar';

type Tree = { [key: string]: string | Tree };

function* leaves(tree: Tree, path: string[] = []): Generator<{ path: string; value: string }> {
  for (const key of Object.keys(tree)) {
    const value = tree[key];
    const here = [...path, key];
    if (typeof value === 'string') yield { path: here.join('.'), value };
    else yield* leaves(value, here);
  }
}

const flatten = (tree: Tree) => new Map([...leaves(tree)].map(({ path, value }) => [path, value]));

const EN = flatten(en as unknown as Tree);
const AR = flatten(ar as unknown as Tree);

// Identical on purpose, each with the reason and the date it was accepted.
// Printed on every run so the two green entries are read rather than assumed —
// the same discipline verify-architecture.mjs applies to its carried
// violation. Without this list the check fires on them, and the obvious way to
// make it green is to translate the labels, which breaks the design they came
// from.
const IDENTICAL_BY_DESIGN: ReadonlyArray<{ path: string; why: string; since: string }> = [
  {
    path: 'shell.switchToArabic',
    why: 'the button names the language you would switch TO, so it reads the same either way',
    since: '2026-08-29',
  },
  {
    path: 'shell.switchToEnglish',
    why: 'the button names the language you would switch TO, so it reads the same either way',
    since: '2026-08-29',
  },
];
const allowed = new Set(IDENTICAL_BY_DESIGN.map((entry) => entry.path));

test('every value in both files says something', () => {
  const blank: string[] = [];
  for (const [file, dictionary] of [['en.ts', EN], ['ar.ts', AR]] as const) {
    for (const [path, value] of dictionary) {
      if (value.trim() === '') blank.push(`${file}: ${path} is empty`);
    }
  }
  expect(blank).toEqual([]);
});

test('no key was copied across instead of translated', () => {
  const copied: string[] = [];
  for (const [path, english] of EN) {
    const arabic = AR.get(path);
    if (arabic === undefined || arabic !== english) continue;
    if (allowed.has(path)) continue;
    copied.push(`${path} is "${english}" in en.ts and ar.ts alike — translated, or copied?`);
  }
  expect(copied).toEqual([]);
});

test('the allowlist still describes something true', () => {
  // An entry that is no longer identical is an entry nobody removed. Left
  // alone it becomes permission for a future copy-paste under the same name.
  const stale = IDENTICAL_BY_DESIGN.filter(({ path }) => {
    const english = EN.get(path);
    return english === undefined || AR.get(path) !== english;
  }).map(({ path }) => `${path} is allowlisted as identical but is not`);
  expect(stale).toEqual([]);
});

test('the two files compare a non-empty set of keys', () => {
  // A check that passes over an empty set is worse than no check.
  expect(EN.size).toBeGreaterThan(0);
  expect([...AR.keys()].sort()).toEqual([...EN.keys()].sort());

  console.log(
    `i18n parity — compared ${EN.size} keys across en.ts and ar.ts; ` +
      `${IDENTICAL_BY_DESIGN.length} identical by design`,
  );
  for (const { path, why, since } of IDENTICAL_BY_DESIGN) {
    console.log(`  · ${path} — ${why} (accepted ${since})`);
  }
});

export { flatten, IDENTICAL_BY_DESIGN };
