// Proves criteria 2, 3 and 4 of scripts/criteria/platform.md section
// PLATFORM-10-WEB: both directions come from one rule set, the text comes from
// resource files, and a screen composes without restating the scale.
import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { Button, Card, Field, Heading, Stack, Text } from './index';
import { en } from '../i18n/en';
import { ar } from '../i18n/ar';

const UI_DIR = path.dirname(fileURLToPath(import.meta.url));

test('a screen assembles from primitives without restating the scale', () => {
  render(
    <Stack gap={4}>
      <Card>
        <Heading level={1}>Title</Heading>
        <Text variant="muted">Body</Text>
        <Field id="email" label="Email" />
        <Button>Go</Button>
      </Card>
    </Stack>,
  );

  expect(screen.getByRole('heading', { level: 1, name: 'Title' })).toBeInTheDocument();
  expect(screen.getByLabelText('Email')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
});

test('the primitives carry no inline style, so nothing bypasses the tokens', () => {
  const { container } = render(
    <Card>
      <Heading level={2}>Title</Heading>
      <Button variant="secondary">Go</Button>
    </Card>,
  );
  for (const element of container.querySelectorAll('*')) {
    expect(element.getAttribute('style')).toBeNull();
  }
});

// Comments are stripped before the scan. A stylesheet that explains why it
// does not use a [dir=] override contains the words of the rule, and a naive
// search cannot tell the explanation from the violation (L-13).
const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

test('the stylesheets mirror by writing direction, not by a second rule set', () => {
  const stylesheets = readdirSync(UI_DIR).filter((f) => f.endsWith('.css'));
  for (const file of stylesheets) {
    const css = withoutComments(readFileSync(path.join(UI_DIR, file), 'utf8'));
    // A [dir="rtl"] override is a second copy of the layout — the thing the
    // direction criterion exists to prevent.
    expect(css, `${file} overrides by direction`).not.toMatch(/\[dir\s*=/);
    // Physical inline-axis properties do not follow the direction.
    expect(css, `${file} uses a physical inline property`).not.toMatch(
      /^\s*(?:margin|padding)-(?:left|right)\s*:/m,
    );
    expect(css, `${file} aligns text physically`).not.toMatch(/text-align:\s*(?:left|right)\b/);
  }
});

test('both resource files carry the same keys, so neither language can go missing', () => {
  const flatten = (o: object, prefix = ''): string[] =>
    Object.entries(o).flatMap(([k, v]) =>
      typeof v === 'object' && v !== null ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
    );
  expect(flatten(ar).sort()).toEqual(flatten(en).sort());
});

test('the two languages are actually different text', () => {
  expect(ar.signIn.heading).not.toBe(en.signIn.heading);
  expect(ar.home.heading).not.toBe(en.home.heading);
});
