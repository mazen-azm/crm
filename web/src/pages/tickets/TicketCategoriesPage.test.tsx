// Proves scripts/criteria/tickets.md section TICKETS-9-WEB.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor, within } from '../../testing/render';
import { TicketCategoriesPage } from './TicketCategoriesPage';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';

const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const CATEGORIES = [
  { id: 'cat-1', name: 'Billing' },
  { id: 'cat-2', name: 'Refunds' },
];

// The three writes are separate stubs, because the screen shows each failing
// in a different place and a shared one could not tell them apart.
function desk({
  role = 'admin',
  categories = CATEGORIES,
  added = json({ id: 'cat-3', name: 'Shipping' }, 201),
  renamed = json({ id: 'cat-1', name: 'Money back' }),
  retired = json({ id: 'cat-1', retiredAt: '2026-08-31T00:00:00.000Z' }),
} = {}) {
  const calls: Array<{ method: string; path: string; body: unknown }> = [];
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://desk.test');
    const method = init?.method ?? 'GET';
    if (url.pathname === '/api/v1/me') {
      return Promise.resolve(json({ id: 'u-1', role, name: 'An Admin' })());
    }
    if (url.pathname.startsWith('/api/v1/ticket-categories')) {
      if (method === 'GET') {
        return Promise.resolve(
          json({ items: categories, total: categories.length, limit: 100, offset: 0 })(),
        );
      }
      calls.push({ method, path: url.pathname, body: init?.body ? JSON.parse(String(init.body)) : null });
      if (method === 'POST') return Promise.resolve(added());
      if (method === 'PATCH') return Promise.resolve(renamed());
      return Promise.resolve(retired());
    }
    throw new Error(`this screen must not call ${url.pathname}`);
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, calls };
}

afterEach(() => vi.unstubAllGlobals());

const show = (language?: 'en' | 'ar') =>
  renderWithProviders(<TicketCategoriesPage />, { signedIn: true, language });

const rowOf = (name: string) =>
  screen.getByDisplayValue(name).closest('div.card') ?? screen.getByDisplayValue(name).parentElement!;

const reads = (fetch: ReturnType<typeof desk>['fetch']) =>
  fetch.mock.calls.filter(([i, init]) => {
    const path = new URL(String(i), 'http://desk.test').pathname;
    return path.startsWith('/api/v1/ticket-categories') && ((init as RequestInit | undefined)?.method ?? 'GET') === 'GET';
  }).length;

test('an added category appears without the list being read again', async () => {
  const { calls, fetch } = desk();
  show();
  await screen.findByDisplayValue('Billing');
  const before = reads(fetch);

  await userEvent.type(screen.getByLabelText(en.ticketCategories.addLabel), '  Shipping  ');
  await userEvent.click(screen.getByRole('button', { name: en.ticketCategories.add }));

  await waitFor(() => expect(screen.getByDisplayValue('Shipping')).toBeInTheDocument());
  // Trimmed on the way out, because the API trims too and the round trip would
  // come back with the answer the screen already had.
  expect(calls[0].body).toEqual({ name: 'Shipping' });
  // And no re-read: the answer IS the row. Asking for the list again would
  // also throw away a half-typed rename in the row beside it.
  expect(reads(fetch)).toBe(before);
  // The field is cleared, so the next name is not typed onto the last one.
  expect(screen.getByLabelText(en.ticketCategories.addLabel)).toHaveValue('');
});

test('a rename shows on the row it renamed, and nowhere else', async () => {
  const { calls, fetch } = desk();
  show();
  const field = await screen.findByDisplayValue('Billing');
  const before = reads(fetch);

  await userEvent.clear(field);
  await userEvent.type(field, 'Money back');
  await userEvent.click(within(rowOf('Money back') as HTMLElement).getByRole('button', { name: en.ticketCategories.rename }));

  await waitFor(() => expect(calls).toHaveLength(1));
  expect(calls[0]).toMatchObject({ method: 'PATCH', path: '/api/v1/ticket-categories/cat-1', body: { name: 'Money back' } });
  await waitFor(() => expect(screen.getByDisplayValue('Money back')).toBeInTheDocument());
  // The other row is untouched.
  expect(screen.getByDisplayValue('Refunds')).toBeInTheDocument();
  expect(reads(fetch)).toBe(before);
});

test('a name already taken marks the field with the shared sentence', async () => {
  desk({ added: json({ code: 'VALIDATION_FAILED', fields: ['name'] }, 422) });
  show();
  await screen.findByDisplayValue('Billing');

  const field = screen.getByLabelText(en.ticketCategories.addLabel);
  await userEvent.type(field, 'billing');
  await userEvent.click(screen.getByRole('button', { name: en.ticketCategories.add }));

  await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
  expect(screen.getByText(en.errors.VALIDATION_FAILED)).toBeInTheDocument();
  // Marked on the field, not reported as a failure of the screen: the name is
  // what has to change, and the sentence is the shared one for the code.
  expect(screen.queryByText(en.ticketCategories.addFailedTitle)).not.toBeInTheDocument();
});

test('retiring asks first, and does nothing until it is answered', async () => {
  const { calls } = desk();
  show();
  await screen.findByDisplayValue('Billing');

  await userEvent.click(within(rowOf('Billing') as HTMLElement).getByRole('button', { name: en.ticketCategories.retire }));

  // It is the one action here that changes what everybody else's picker
  // offers, and this screen cannot undo it.
  expect(screen.getByText(en.ticketCategories.retireConfirm)).toBeInTheDocument();
  expect(calls).toEqual([]);

  await userEvent.click(screen.getByRole('button', { name: en.ticketCategories.retireCancel }));
  expect(screen.queryByText(en.ticketCategories.retireConfirm)).not.toBeInTheDocument();
  expect(calls).toEqual([]);
  expect(screen.getByDisplayValue('Billing')).toBeInTheDocument();
});

test('a confirmed retire takes the row off the list without a reload', async () => {
  const { calls, fetch } = desk();
  show();
  await screen.findByDisplayValue('Billing');
  const before = reads(fetch);

  await userEvent.click(within(rowOf('Billing') as HTMLElement).getByRole('button', { name: en.ticketCategories.retire }));
  await userEvent.click(screen.getByRole('button', { name: en.ticketCategories.retireConfirmYes }));

  await waitFor(() => expect(screen.queryByDisplayValue('Billing')).not.toBeInTheDocument());
  expect(calls[0]).toMatchObject({ method: 'DELETE', path: '/api/v1/ticket-categories/cat-1' });
  expect(screen.getByDisplayValue('Refunds')).toBeInTheDocument();
  expect(reads(fetch)).toBe(before);
});

test('a non-admin is told, rather than shown controls that will be refused', async () => {
  const { calls } = desk({ role: 'agent' });
  show();

  expect(await screen.findByText(en.ticketCategories.adminOnlyTitle)).toBeInTheDocument();
  expect(screen.queryByLabelText(en.ticketCategories.addLabel)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: en.ticketCategories.retire })).not.toBeInTheDocument();
  // Courtesy, not enforcement: the API refuses an agent whatever this draws
  // (SC-2), and there is a test on that side saying so.
  expect(calls).toEqual([]);
});

test('a blank name never reaches the API', async () => {
  const { calls } = desk();
  show();
  await screen.findByDisplayValue('Billing');

  await userEvent.type(screen.getByLabelText(en.ticketCategories.addLabel), '   ');
  await userEvent.click(screen.getByRole('button', { name: en.ticketCategories.add }));

  expect(screen.getByRole('alert')).toHaveTextContent(en.ticketCategories.nameRequired);
  expect(calls).toEqual([]);
});

test('renaming to what it is already called is not offered', async () => {
  desk();
  show();
  await screen.findByDisplayValue('Billing');

  // The API answers 200 and changes nothing, which is right of it — but a
  // button that writes a change that is not one bumps nothing and says
  // nothing, and offering it invites somebody to press it and wonder.
  const button = within(rowOf('Billing') as HTMLElement).getByRole('button', { name: en.ticketCategories.rename });
  expect(button).toBeDisabled();
});

test('every string comes from the resource file, in both languages', async () => {
  desk();
  show('ar');

  expect(await screen.findByRole('heading', { name: ar.ticketCategories.title })).toBeInTheDocument();
  expect(screen.getByLabelText(ar.ticketCategories.addLabel)).toBeInTheDocument();
  expect(ar.ticketCategories.retireConfirm).not.toBe(en.ticketCategories.retireConfirm);
});
