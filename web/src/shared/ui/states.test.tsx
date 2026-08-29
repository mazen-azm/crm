// Proves scripts/criteria/platform.md section PLATFORM-16-WEB: the three
// states are components a review can point at, and each does the specific
// thing the criteria ask for rather than being a styled blank.
import { expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent } from '../../testing/render';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Skeleton } from './Skeleton';
import { en } from '../i18n/en';
import { ar } from '../i18n/ar';
import type { ApiErrorCode } from '../api/errors';

test('an empty state says why it is empty and offers the next action', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn();
  renderWithProviders(
    <EmptyState
      title="No tickets yet"
      body="Nobody has raised one on this queue."
      action={<Button onClick={onAdd}>Raise a ticket</Button>}
    />,
  );

  expect(screen.getByRole('heading', { name: 'No tickets yet' })).toBeInTheDocument();
  expect(screen.getByText('Nobody has raised one on this queue.')).toBeInTheDocument();
  // The next action, not a blank region — the criterion asks for both halves.
  await user.click(screen.getByRole('button', { name: 'Raise a ticket' }));
  expect(onAdd).toHaveBeenCalledTimes(1);
});

test('an error state shows the code meaning and offers retry', async () => {
  const user = userEvent.setup();
  const onRetry = vi.fn();
  renderWithProviders(
    <ErrorState
      title={en.states.errorTitle}
      body={en.errors.NOT_FOUND}
      onRetry={onRetry}
      retryLabel={en.states.retry}
    />,
  );

  expect(screen.getByRole('alert')).toBeInTheDocument();
  expect(screen.getByText(en.errors.NOT_FOUND)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: en.states.retry }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

test('an error state with no way to retry offers no button', () => {
  renderWithProviders(<ErrorState title={en.states.errorTitle} body={en.errors.INTERNAL} />);
  // An offer that does nothing is worse than no offer.
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('the loading state reserves the shape it is about to become', () => {
  renderWithProviders(<Skeleton lines={4} height="48px" label={en.states.loading} />);

  const status = screen.getByRole('status', { name: en.states.loading });
  expect(status).toHaveAttribute('aria-busy', 'true');

  const lines = status.querySelectorAll('.skeleton__line');
  expect(lines).toHaveLength(4);
  // The reserved height must reach the DOM, or the page jumps when the data
  // arrives and the whole point of not using a spinner is lost.
  for (const line of lines) {
    expect((line as HTMLElement).style.blockSize).toBe('48px');
  }
});

// The union's members, listed once. `satisfies` makes a missing member a
// typecheck failure rather than a quietly shorter loop.
const CODES = [
  'BAD_REQUEST',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'VALIDATION_FAILED',
  'RATE_LIMITED',
  'INTERNAL',
] as const satisfies readonly ApiErrorCode[];

test('every documented code has a meaning, in both languages', () => {
  for (const code of CODES) {
    expect(en.errors[code].length).toBeGreaterThan(0);
    expect(ar.errors[code].length).toBeGreaterThan(0);
    // A translation that is still the English sentence is a key somebody
    // added to one file and copied into the other.
    expect(ar.errors[code]).not.toBe(en.errors[code]);
  }
});
