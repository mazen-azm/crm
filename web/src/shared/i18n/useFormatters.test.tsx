// Proves the formatters follow the switch: the same value, the same component,
// a different reading after the language changes.
import { expect, test } from 'vitest';

import { renderWithProviders, screen, userEvent } from '../../testing/render';
import { DeskShell } from '../../app/desk-shell/DeskShell';
import { useFormatters } from './useFormatters';
import { en } from './en';

function Probe() {
  const { formatNumber, formatDate, formatRelativeTime } = useFormatters();
  return (
    <dl>
      <dd data-testid="number">{formatNumber(1234567.89)}</dd>
      <dd data-testid="date">{formatDate('2026-08-28T12:00:00Z')}</dd>
      <dd data-testid="ago">{formatRelativeTime(-3, 'hour')}</dd>
    </dl>
  );
}

const ARABIC_INDIC = /[٠-٩]/;
const text = (id: string) => screen.getByTestId(id).textContent ?? '';

test('the formatters read the active language without being told', () => {
  renderWithProviders(<Probe />, { language: 'ar' });
  expect(text('number')).toMatch(ARABIC_INDIC);
  expect(text('date')).toMatch(ARABIC_INDIC);
});

test('switching the language re-reads every formatted value in place', async () => {
  const user = userEvent.setup();
  renderWithProviders(
    <DeskShell>
      <Probe />
    </DeskShell>,
    { signedIn: true },
  );

  expect(text('number')).toBe('1,234,567.89');
  const before = text('ago');

  await user.click(screen.getByRole('button', { name: en.shell.switchToArabic }));

  // Same tree, no reload: the memo is keyed on the language, so every value
  // re-reads rather than keeping the digits it was first rendered with.
  expect(text('number')).toMatch(ARABIC_INDIC);
  expect(text('date')).toMatch(ARABIC_INDIC);
  expect(text('ago')).not.toBe(before);
});
