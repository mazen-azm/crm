// Proves the first criterion of scripts/criteria/languages.md section
// LANGUAGES-1-WEB, and rule BR-6: no screen writes a string a user reads.
//
// It walks a real AST rather than the source text, because a screen is
// full of strings that nobody reads — an import path, a className, a route, an
// id, type="email" — and a search for quotes cannot tell them from a sentence
// (L-13). Only two productions count:
//
//   1. JSX text between tags:            <Heading>Sign in</Heading>
//   2. A raw string in a text-carrying   <button title="Go">
//      attribute
//
// Everything else is deliberately ignored, and the second test below pins that
// list down so the guard's grammar stays under test.
import { expect, test } from 'vitest';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
// @babel/parser, not typescript: the TypeScript 7 npm package is the native
// port and exports only its version — there is no JavaScript compiler API in
// it to walk an AST with. Babel's parser is a parser and nothing else, which
// is all this guard needs.
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import type { NodePath } from '@babel/traverse';

const traverse = (_traverse as unknown as { default?: typeof _traverse }).default ?? _traverse;

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// 'app' is scanned because the desk shell lives there and renders labels a
// person reads. A guard whose scope excludes a rendering surface is not a
// guard (L-6) — and the whole directory rather than just the shell's folder,
// because scoping it to one folder means the next surface added under app/
// reopens the gap with the suite still green. It costs nothing: everything
// else in app/ is already free of user-facing literals.
const SCANNED = ['pages', 'features', 'app'];

// Attributes whose value is read aloud or shown. Every other attribute —
// className, id, name, type, role, href, htmlFor, data-* — is machinery.
const TEXT_ATTRIBUTES = new Set([
  'alt',
  'aria-description',
  'aria-label',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'placeholder',
  'title',
]);

type Violation = { file: string; line: number; column: number; kind: string; text: string };

export function findLiterals(fileName: string, code: string): Violation[] {
  const ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  const found: Violation[] = [];

  traverse(ast, {
    JSXText(pathNode: NodePath) {
      const node = pathNode.node as { value: string; loc?: { start: { line: number; column: number } } };
      const text = node.value.trim();
      if (!text) return;
      found.push({
        file: fileName,
        line: node.loc?.start.line ?? 0,
        column: (node.loc?.start.column ?? 0) + 1,
        kind: 'jsx text',
        text,
      });
    },
    JSXAttribute(pathNode: NodePath) {
      const node = pathNode.node as {
        name: { type: string; name?: string };
        value?: { type: string; value?: string };
        loc?: { start: { line: number; column: number } };
      };
      const name = node.name.type === 'JSXIdentifier' ? node.name.name : undefined;
      if (!name || !TEXT_ATTRIBUTES.has(name)) return;
      if (node.value?.type !== 'StringLiteral') return;
      found.push({
        file: fileName,
        line: node.loc?.start.line ?? 0,
        column: (node.loc?.start.column ?? 0) + 1,
        kind: `${name} attribute`,
        text: node.value.value ?? '',
      });
    },
  });

  return found;
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec|stories)\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

test('no screen writes a string a user reads', () => {
  const files = SCANNED.flatMap((dir) => sourceFiles(path.join(SRC, dir)));
  expect(files.length, 'the scan read no files').toBeGreaterThan(0);

  const violations = files.flatMap((file) =>
    findLiterals(path.relative(SRC, file), readFileSync(file, 'utf8')),
  );

  expect(
    violations.map((v) => `${v.file}:${v.line}:${v.column} — ${v.kind}: ${v.text}`),
  ).toEqual([]);
});

test('the guard flags what a user reads, and nothing a machine reads', () => {
  const sample = `
    export function Screen() {
      return (
        <form className="x" id="email" onSubmit={onSubmit}>
          <Heading level={1}>Sign in</Heading>
          <button type="submit" title="Go" aria-label="Go now">{t.signIn.submit}</button>
          <input type="email" autoComplete="username" placeholder={t.signIn.emailLabel} />
          <a href="/help" data-testid="help">{t.help}</a>
        </form>
      );
    }
  `;

  const flagged = findLiterals('sample.tsx', sample).map((v) => `${v.kind}: ${v.text}`);

  expect(flagged.sort()).toEqual([
    'aria-label attribute: Go now',
    'jsx text: Sign in',
    'title attribute: Go',
  ]);
});

test('the dictionary is read by key, never by position', () => {
  const files = SCANNED.flatMap((dir) => sourceFiles(path.join(SRC, dir)));
  const offenders: string[] = [];

  for (const file of files) {
    const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    code.split('\n').forEach((line, i) => {
      if (/\bObject\.(values|entries|keys)\(\s*t\s*\)|\bt\[\s*\d/.test(line)) {
        offenders.push(`${path.relative(SRC, file)}:${i + 1} — dictionary read by position; use t.section.key`);
      }
    });
  }

  expect(offenders).toEqual([]);
});
