// Proves scripts/criteria/customers.md section CUSTOMERS-2-WEB.
import { afterEach, expect, test, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';

import { renderWithProviders, screen, userEvent, waitFor } from '../../testing/render';
import { CustomerScreenPage } from './CustomerScreenPage';
import { en } from '../../shared/i18n/en';

const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const SCREEN = {
  customer: {
    id: 'c-1',
    name: 'Leila Mansour',
    email: 'leila.mansour@example.com',
    phone: '+20 2 5555 0177',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  tickets: {
    items: [
      {
        id: 't-1',
        subject: 'Charged twice for the August invoice',
        status: 'pending',
        priority: 'urgent',
        assigneeId: null,
        categoryId: null,
        revision: 1,
        allowedTransitions: ['open', 'resolved'],
        resolutionNote: null,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      },
    ],
    total: 1,
    limit: 20,
    offset: 0,
  },
  notes: {
    items: [
      { id: 'n-1', customerId: 'c-1', authorId: 'u-1', body: 'Rang about the invoice.', createdAt: '2026-08-02T00:00:00.000Z' },
    ],
    total: 1,
  },
};

// Renders at the route, so useParams sees an id the way the app does.
const at = (path = '/customers/c-1') =>
  renderWithProviders(
    <Routes>
      <Route path="/customers/:id" element={<CustomerScreenPage />} />
    </Routes>,
    { route: path, signedIn: 'tok' },
  );

afterEach(() => vi.unstubAllGlobals());

test('the customer, their tickets and their notes come from ONE request', async () => {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      calls.push(new URL(String(input), 'http://desk.test').pathname);
      return Promise.resolve(json(SCREEN)());
    }),
  );

  at();
  await waitFor(() => expect(screen.getByText('Leila Mansour')).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText('Rang about the invoice.')).toBeInTheDocument());

  // The count is the criterion. A screen that happens to make one request today
  // and four next month passes an assertion about content and fails this one.
  expect(calls).toEqual(['/api/v1/customers/c-1']);
});

test('a ticket shows words, not the API\'s raw values', async () => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(json(SCREEN)())));
  at();

  await waitFor(() => expect(screen.getByText(/Charged twice/)).toBeInTheDocument());
  const meta = screen.getByText(new RegExp(en.ticketQueue.statusPending));
  expect(meta).toHaveTextContent(en.ticketQueue.priorityUrgent);
  // `pending` and `urgent` are what the API sends; a person reads neither.
  expect(screen.queryByText(/\bpending\b/)).not.toBeInTheDocument();
});

test('a customer with nothing open says so and offers the next action', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(json({ ...SCREEN, tickets: { items: [], total: 0, limit: 20, offset: 0 } })())),
  );
  at();

  await waitFor(() => expect(screen.getByText(en.customerScreen.noOpenTickets)).toBeInTheDocument());
  // D-2 asks for the next action, and raising a ticket is a real one because
  // that screen exists.
  const raise = screen.getByRole('link', { name: en.customerScreen.raiseOne });
  expect(raise).toHaveAttribute('href', '/tickets/new');
});

test('a customer with no notes says so rather than showing a blank region', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(json({ ...SCREEN, notes: { items: [], total: 0 } })())),
  );
  at();
  await waitFor(() => expect(screen.getByText(en.customerScreen.noNotes)).toBeInTheDocument());
});

test('a failure says what the code means and offers to try again', async () => {
  let fail = true;
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(fail ? json({ code: 'NOT_FOUND', requestId: 'rq' }, 404)() : json(SCREEN)())),
  );
  at();

  await waitFor(() => expect(screen.getByText(en.customerScreen.errorTitle)).toBeInTheDocument());
  expect(screen.getByText(en.errors.NOT_FOUND)).toBeInTheDocument();

  fail = false;
  await userEvent.click(screen.getByRole('button', { name: en.states.retry }));
  await waitFor(() => expect(screen.getByText('Leila Mansour')).toBeInTheDocument());
});

test('the contact details are isolated so a phone number is not reordered', async () => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(json(SCREEN)())));
  const { container } = at();

  await waitFor(() => expect(screen.getByText('Leila Mansour')).toBeInTheDocument());
  const isolated = [...container.querySelectorAll('bdi')].map((e) => e.textContent);
  expect(isolated).toContain('+20 2 5555 0177');
});

test('a customer with no email or phone says so rather than showing nothing', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(json({ ...SCREEN, customer: { ...SCREEN.customer, email: null, phone: null } })())),
  );
  at();

  await waitFor(() => expect(screen.getByText(en.customerScreen.noEmail)).toBeInTheDocument());
  expect(screen.getByText(en.customerScreen.noPhone)).toBeInTheDocument();
});
