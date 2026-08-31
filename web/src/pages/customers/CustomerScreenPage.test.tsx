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
      const path = new URL(String(input), 'http://desk.test').pathname;
      calls.push(path);
      if (path.startsWith('/api/v1/assignees')) {
        return Promise.resolve(json({ items: [], total: 0, limit: 100, offset: 0 })());
      }
      return Promise.resolve(json(SCREEN)());
    }),
  );

  at();
  await waitFor(() => expect(screen.getByText('Leila Mansour')).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText('Rang about the invoice.')).toBeInTheDocument());

  // The criterion names three things — the customer, their tickets, their
  // notes — and asks for one request, so that is what this counts. It
  // deliberately does NOT count every call the screen makes: a reference list
  // such as the staff names is not one of the three, and the queue loads its
  // own the same way. An assertion on the total was the first version, and it
  // broke the moment note authors needed names — for a reason that had nothing
  // to do with the rule it was guarding.
  expect(calls.filter((p) => p === '/api/v1/customers/c-1')).toEqual(['/api/v1/customers/c-1']);
  expect(calls.some((p) => p.includes('/notes'))).toBe(false);
  expect(calls.some((p) => p.startsWith('/api/v1/tickets'))).toBe(false);
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
  at();

  // The details became editable (CUSTOMERS-7-WEB), so the <bdi> that used to
  // isolate them is gone — and the problem it solved is not. An input inherits
  // the document's direction, and a phone number inside an Arabic page would
  // be reordered exactly as it was inside an Arabic paragraph: the groups
  // reverse and the plus lands at the far end.
  //
  // dir="auto" is <bdi> for a value somebody can edit — the content decides,
  // so this reads left to right and an Arabic name in the field above does
  // not.
  const phone = await screen.findByLabelText(en.customerScreen.phoneLabel);
  expect(phone).toHaveValue('+20 2 5555 0177');
  expect(phone).toHaveAttribute('dir', 'auto');
  expect(await screen.findByLabelText(en.customerScreen.nameLabel)).toHaveAttribute('dir', 'auto');
});

test('a customer with no email or phone says so rather than showing nothing', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(json({ ...SCREEN, customer: { ...SCREEN.customer, email: null, phone: null } })())),
  );
  at();

  // The same words, now as placeholders: the fields are empty because the
  // customer has neither, and an empty box saying nothing would be a box
  // somebody has to guess at.
  await waitFor(() =>
    expect(screen.getByLabelText(en.customerScreen.emailLabel)).toHaveAttribute(
      'placeholder',
      en.customerScreen.noEmail,
    ),
  );
  expect(screen.getByLabelText(en.customerScreen.emailLabel)).toHaveValue('');
  expect(screen.getByLabelText(en.customerScreen.phoneLabel)).toHaveAttribute(
    'placeholder',
    en.customerScreen.noPhone,
  );
});
