// Proves criterion 1 of scripts/criteria/platform.md section PLATFORM-10-WEB,
// and rule D-1: no colour literal exists outside the tokens file.
//
// The scan is narrow on purpose — the web root only, CSS declarations only,
// tokens.css excluded because it is the file that is allowed to hold them.
// The repo-wide version across all three roots is PLATFORM-15-ALL's script;
// building it here would be another story's work with a weaker tool (L-10).
import { expect, test } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const WEB_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TOKENS = path.join(WEB_SRC, 'shared/ui/tokens.css');

// A colour on the right-hand side of a declaration: hex, rgb/hsl functions, or
// one of the named colours a stylesheet actually reaches for. Matching the
// declaration rather than the whole line keeps a comment or a class name that
// contains the word "white" from reading as a violation (L-13).
// A declaration follows a { or a ; — anchoring to the start of a line missed
// every rule written on one line, which is a guard that cannot fail.
const DECLARATION = /[{;]\s*(?:--)?[a-z-]+\s*:\s*([^;}]+)[;}]/gi;
const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|color-mix)\(|\b(?:white|black|red|blue|green|grey|gray|yellow|orange|purple)\b/i;

function cssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(full);
    return entry.name.endsWith('.css') ? [full] : [];
  });
}

test('no colour literal exists outside the tokens file', () => {
  const offenders: string[] = [];

  for (const file of cssFiles(WEB_SRC)) {
    if (file === TOKENS) continue;
    // Comments explain the rule and would read as violations of it (L-13).
    const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const match of source.matchAll(DECLARATION)) {
      if (COLOUR.test(match[1])) {
        offenders.push(`${path.relative(WEB_SRC, file)}: ${match[0].trim()}`);
      }
    }
  }

  expect(offenders).toEqual([]);
});

test('the scan read something — a check over an empty set is worse than none', () => {
  const files = cssFiles(WEB_SRC).filter((f) => f !== TOKENS);
  expect(files.length).toBeGreaterThan(5);
});

test('the tokens file is the one that actually holds the colours', () => {
  const tokens = readFileSync(TOKENS, 'utf8');
  expect(tokens).toMatch(COLOUR);
  // Every colour token a primitive reads must be defined there.
  for (const name of ['--color-bg-page', '--color-text-primary', '--color-accent', '--color-danger']) {
    expect(tokens).toContain(`${name}:`);
  }
});
