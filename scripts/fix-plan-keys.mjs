#!/usr/bin/env node
// Rewrite the tracker keys in a plan to the ones scripts/story-keys.txt holds.
//
// story-keys.txt gave the planner somewhere to read a key instead of counting,
// and the standing hint in every intake points at it. It reduced the mistake
// and did not remove it: a plan generated after both still cited
// CONVERSATION-1-API as CRM-102 and again as the owner of a rule it does not
// own. A hint is advice, and advice is followed sometimes.
//
// The mapping is machine-readable and the correction is deterministic, so it
// is made rather than requested — the same move plan-next.sh already makes for
// the heading number. verify-plan still checks the result against Jira, so
// this cannot quietly write a wrong key of its own: it can only replace a key
// with the one the tracker gave for that id.
//
//   node scripts/fix-plan-keys.mjs <plan.md>

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const path = process.argv[2];
if (!path) {
  console.error('usage: node scripts/fix-plan-keys.mjs <plan.md>');
  process.exit(1);
}

const keys = new Map(
  readFileSync(join(HERE, 'story-keys.txt'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split(/\s+/)),
);

let text = readFileSync(path, 'utf8');
const fixed = [];

// `FULL-NAME-ID` followed by a key in brackets, backticked or not. Only the
// key is rewritten; the id is what the writer meant and is left alone.
text = text.replace(
  /\b([A-Z][A-Z-]*-\d+-(?:API|WEB|MOB|ALL))(`?\s*\(\s*`?)([A-Z]+-\d+)(`?\s*\))/g,
  (whole, id, open, key, close) => {
    const right = keys.get(id);
    if (!right || right === key) return whole;
    fixed.push(`${id}: ${key} -> ${right}`);
    return `${id}${open}${right}${close}`;
  },
);

if (fixed.length === 0) {
  console.log('plan keys: nothing to correct');
} else {
  writeFileSync(path, text);
  for (const line of fixed) console.log(`plan keys: ${line}`);
}
