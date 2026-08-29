// Proves scripts/criteria/customers.md section CUSTOMERS-1-WEB. This is the
// first screen with a list, so it is also the first caller of the three state
// components (CRM-31) and the locale formatters (CRM-39) — both shipped with
// no consumer and said so at the time.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor } from '../../testing/render';
import { CustomersPage } from './CustomersPage';
import { en } from '../../shared/i18n/en';

const customer = (id: string, name: string, extra = {}) => ({
  id,
  name,
  email: `${id}@example.com`,
  phone: '+20 2 5555 0177',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...extra,
});

// A FRESH Response per call, always. A Response body can be read once, so
// `mockResolvedValue(page(...))` hands the same consumed instance to the second
// caller and its .json() throws — which shows up as a screen stuck loading and
// a test that waits out its timeout rather than as anything mentioning bodies.
const page = (items: unknown[], total = items.length, offset = 0) => () =>
  new Response(JSON.stringify({ items, total, limit: 20, offset }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

// Same rule for the failures.
const answering = (...responses: Array<() => Response>) => {
  const queue = [...responses];
  return vi.fn(() => Promise.resolve((queue.length > 1 ? queue.shift()! : queue[0])()));
};

// The client fetches a relative path (`/api/v1/...`), so a base is needed to
// read the query off it.
const askedFor = (call: unknown[]) => new URL(String(call[0]), 'http://desk.test').searchParams;

const failing = (code: string, status = 500) => () =>
  new Response(JSON.stringify({ code, requestId: 'r-1' }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

afterEach(() => vi.unstubAllGlobals());

test('the screen asks for the customers without being told to', async () => {
  const fetchMock = answering(page([customer('c1', 'Leila Mansour')]));
  vi.stubGlobal('fetch', fetchMock);
  renderWithProviders(<CustomersPage />, { signedIn: true });

  expect(await screen.findByText('Leila Mansour')).toBeInTheDocument();
  // An agent opening this wants the customers, not an empty box.
  expect(askedFor(fetchMock.mock.calls[0]).get('q')).toBeNull();
});

test('nothing found shows why, and offers the way back', async () => {
  const user = userEvent.setup();
  const fetchMock = answering(
    page([customer('c1', 'Leila Mansour')]),
    page([]),
    page([customer('c1', 'Leila Mansour')]),
  );
  vi.stubGlobal('fetch', fetchMock);
  renderWithProviders(<CustomersPage />, { signedIn: true });
  await screen.findByText('Leila Mansour');

  await user.type(screen.getByLabelText(en.customers.searchLabel), 'nobody');
  await user.click(screen.getByRole('button', { name: en.customers.search }));

  // Not a blank region: it says what happened and what to do next.
  expect(await screen.findByRole('heading', { name: en.customers.emptyTitle })).toBeInTheDocument();
  expect(screen.getByText(en.customers.emptyBody)).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: en.customers.emptyAction }));
  expect(await screen.findByText('Leila Mansour')).toBeInTheDocument();
});

test('a failed search shows what the API said and offers retry', async () => {
  const user = userEvent.setup();
  const fetchMock = answering(failing('INTERNAL'), page([customer('c1', 'Leila Mansour')]));
  vi.stubGlobal('fetch', fetchMock);
  renderWithProviders(<CustomersPage />, { signedIn: true });

  // The documented code's meaning, not "something went wrong".
  expect(await screen.findByText(en.errors.INTERNAL)).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: en.states.retry }));
  expect(await screen.findByText('Leila Mansour')).toBeInTheDocument();
});

test('a search in flight shows the shared loading state', async () => {
  let release: (r: Response) => void = () => {};
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise<Response>((resolve) => { release = resolve; })),
  );
  renderWithProviders(<CustomersPage />, { signedIn: true });

  expect(await screen.findByRole('status', { name: en.states.loading })).toBeInTheDocument();
  release(page([customer('c1', 'Leila Mansour')])());
  await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
});

test('the screen searches on submit, not on every keystroke', async () => {
  const user = userEvent.setup();
  const fetchMock = answering(page([customer('c1', 'Leila Mansour')]));
  vi.stubGlobal('fetch', fetchMock);
  renderWithProviders(<CustomersPage />, { signedIn: true });
  await screen.findByText('Leila Mansour');

  await user.type(screen.getByLabelText(en.customers.searchLabel), '01001234567');
  // Eleven keystrokes, still one request — the first, on mount.
  expect(fetchMock).toHaveBeenCalledTimes(1);

  await user.click(screen.getByRole('button', { name: en.customers.search }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(askedFor(fetchMock.mock.calls[1]).get('q')).toBe('01001234567');
});

test('paging asks the API for the next window and keeps the submitted term', async () => {
  const user = userEvent.setup();
  const many = Array.from({ length: 20 }, (_, i) => customer(`c${i}`, `Customer ${i}`));
  const fetchMock = answering(page(many, 45, 0));
  vi.stubGlobal('fetch', fetchMock);
  renderWithProviders(<CustomersPage />, { signedIn: true });
  await screen.findByText('Customer 0');

  await user.type(screen.getByLabelText(en.customers.searchLabel), 'Customer');
  await user.click(screen.getByRole('button', { name: en.customers.search }));
  // Wait for the list, not for the call count: while the request is in flight
  // the list is replaced by the skeleton, so the paging buttons are not there.
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

  await user.click(await screen.findByRole('button', { name: en.customers.next }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

  const asked = askedFor(fetchMock.mock.calls[2]);
  expect(asked.get('offset')).toBe('20');
  // The submitted term, not whatever is in the box now.
  expect(asked.get('q')).toBe('Customer');
});

test('previous is dead on the first window, next on the last', async () => {
  vi.stubGlobal('fetch', answering(page([customer('c1', 'Only One')], 1, 0)));
  renderWithProviders(<CustomersPage />, { signedIn: true });
  await screen.findByText('Only One');

  expect(screen.getByRole('button', { name: en.customers.previous })).toBeDisabled();
  expect(screen.getByRole('button', { name: en.customers.next })).toBeDisabled();
});

test('a customer with no contact details says so rather than showing a gap', async () => {
  vi.stubGlobal(
    'fetch',
    answering(page([customer('c1', 'Walk-in counter', { email: null, phone: null })])),
  );
  renderWithProviders(<CustomersPage />, { signedIn: true });

  expect(await screen.findByText(en.customers.noEmail)).toBeInTheDocument();
  expect(screen.getByText(en.customers.noPhone)).toBeInTheDocument();
});

test('the total is formatted for the reader, not printed raw', async () => {
  vi.stubGlobal('fetch', answering(page([customer('c1', 'Leila Mansour')], 1234)));
  renderWithProviders(<CustomersPage />, { signedIn: true, language: 'ar' });

  // Arabic-Indic digits and Arabic grouping, through the formatters — a raw
  // String(total) would read 1234 in both languages.
  expect(await screen.findByText(/١٬٢٣٤/)).toBeInTheDocument();
});
