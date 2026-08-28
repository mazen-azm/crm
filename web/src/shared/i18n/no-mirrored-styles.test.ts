// Proves the third criterion of scripts/criteria/languages.md section
// LANGUAGES-2-WEB: nothing is mirrored by a second stylesheet — the direction
// comes from the same rules as the first.
//
// A layout that is written twice, once for each direction, drifts. One of the
// copies gets a fix and the other does not, and the language nobody on the
// team reads is the one that rots. Logical properties mean there is only ever
// one copy.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const WEB_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Comments go first, and that is not a nicety. tokens.css explains in prose
// that a [dir="rtl"] override block is forbidden — so the sentence describing
// the rule contains the thing the rule forbids, and a scan of raw text fails
// on the documentation of its own purpose (L-13).
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');

const FORBIDDEN: ReadonlyArray<{ pattern: RegExp; what: string; instead: string }> = [
  {
    pattern: /\[dir\s*=/,
    what: 'a [dir=] selector',
    instead: 'logical properties, which flip themselves',
  },
  {
    pattern: /^\s*(?:margin|padding|border)-(?:left|right)\s*:/m,
    what: 'a physical direction property',
    instead: 'the -inline-start / -inline-end form',
  },
  {
    pattern: /^\s*(?:left|right)\s*:/m,
    what: 'a bare left/right offset',
    instead: 'inset-inline-start / inset-inline-end',
  },
  {
    pattern: /text-align\s*:\s*(?:left|right)\b/,
    what: 'text-align left or right',
    instead: 'text-align: start / end',
  },
];

function cssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(full);
    return entry.name.endsWith('.css') ? [full] : [];
  });
}

export function findMirrored(fileName: string, css: string): string[] {
  const source = stripComments(css);
  const found: string[] = [];
  for (const { pattern, what, instead } of FORBIDDEN) {
    // A fresh global copy per file, so lastIndex cannot leak between them.
    const flags = [...new Set([...pattern.flags, 'g', 'm'])].join('');
    const all = new RegExp(pattern.source, flags);
    for (const match of source.matchAll(all)) {
      const line = source.slice(0, match.index).split('\n').length;
      // The matched text goes in the message: 'a physical direction property'
      // without saying which one sends the reader hunting through the file.
      found.push(`${fileName}:${line} ${what} (${match[0].trim()}) — use ${instead}`);
    }
  }
  return found;
}

test('no stylesheet mirrors the layout by hand', () => {
  const files = cssFiles(WEB_SRC);
  expect(files.length).toBeGreaterThan(0);

  const offenders = files.flatMap((file) =>
    findMirrored(path.relative(WEB_SRC, file), readFileSync(file, 'utf8')),
  );
  expect(offenders).toEqual([]);
});

test('the checker catches a real override block', () => {
  const offenders = findMirrored('fake.css', '[dir="rtl"] .thing { margin-left: 4px; }');
  expect(offenders.length).toBeGreaterThanOrEqual(1);
  expect(offenders[0]).toContain('[dir=');
});

test('and does not fail on the comment that explains the rule', () => {
  // The real sentence from tokens.css, which broke the first version of this.
  const prose = '/* A [dir="rtl"] override block would be a second copy of the layout. */\n.a { color: red; }';
  expect(findMirrored('fake.css', prose)).toEqual([]);
});

test('a physical property is caught and named with its logical replacement', () => {
  const offenders = findMirrored('fake.css', '.a {\n  padding-left: 8px;\n}');
  expect(offenders[0]).toContain('padding-left');
  expect(offenders[0]).toContain('inline-start');
});
