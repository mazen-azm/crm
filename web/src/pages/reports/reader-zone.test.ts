import { afterEach, expect, test, vi } from 'vitest';

import { readerZone } from './reader-zone';

afterEach(() => vi.unstubAllGlobals());

test('the zone comes from the runtime, not from the language', () => {
  // Arabic does not mean Cairo, and half the people reading an Arabic
  // interface are not in the same zone as the other half.
  expect(readerZone()).toMatch(/^[A-Za-z]+(\/[A-Za-z_+-]+)*$/);
});

test('a runtime that will not name a zone gets UTC, which is a real answer', () => {
  vi.stubGlobal('Intl', {
    ...Intl,
    DateTimeFormat: function () { return { resolvedOptions: () => ({ timeZone: '' }) }; },
  });
  // Not a refusal: the API accepts UTC, so the report still answers — about
  // the UTC day — and the label on the screen says so.
  expect(readerZone()).toBe('UTC');
});

test('a runtime that throws gets UTC too', () => {
  vi.stubGlobal('Intl', {
    ...Intl,
    DateTimeFormat: function () { throw new RangeError('no zones here'); },
  });
  expect(readerZone()).toBe('UTC');
});
