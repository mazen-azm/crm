// Proves scripts/criteria/portal.md section PORTAL-1-WEB.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor } from '../../testing/render';
import { PublicRaiseTicketPage } from './PublicRaiseTicketPage';
import { AppRoutes } from '../../app/routes';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';

// A FRESH Response per call (L-30).
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const TICKET = {
  id: 'a1b2c3d4-0000-4000-8000-000000000001',
  status: 'new',
  subject: 'The invoice is wrong',
  createdAt: '2026-08-30T09:00:00.000Z',
};

function stub(answer: () => Response = () => json(TICKET, 201)) {
  const sent: Array<Record<string, unknown>> = [];
  const paths: string[] = [];
  const headers: Array<Record<string, string>> = [];
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    paths.push(new URL(String(input), 'http://desk.test').pathname);
    headers.push((init?.headers ?? {}) as Record<string, string>);
    if (init?.body) sent.push(JSON.parse(String(init.body)));
    return Promise.resolve(answer());
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, sent, paths, headers };
}

afterEach(() => vi.unstubAllGlobals());

// No `signedIn`: a stranger is the caller, and that is the whole point.
const render = (language?: 'en' | 'ar') =>
  renderWithProviders(<PublicRaiseTicketPage />, { language });

type Filled = { email?: string; name?: string; subject?: string; body?: string };
async function fill({
  email = 'stranger@example.com',
  name = 'A Stranger',
  subject = 'The invoice is wrong',
  body = 'It says 400 and should say 40.',
}: Filled = {}) {
  if (email) await userEvent.type(screen.getByLabelText(en.portalRaise.email), email);
  if (name) await userEvent.type(screen.getByLabelText(en.portalRaise.name), name);
  if (subject) await userEvent.type(screen.getByLabelText(en.portalRaise.subject), subject);
  if (body) await userEvent.type(screen.getByLabelText(en.portalRaise.body), body);
  await userEvent.click(screen.getByRole('button', { name: en.portalRaise.submit }));
}

test('a stranger sends a request, and gets back something to quote', async () => {
  const { sent, paths } = stub();
  render();

  await fill();

  expect(await screen.findByText(TICKET.id)).toBeInTheDocument();
  expect(screen.getByText(en.portalRaise.reference)).toBeInTheDocument();
  // The reference IS the confirmation — a sentence saying it worked, with
  // nothing to quote, leaves somebody with nothing to say when they telephone.
  expect(screen.queryByLabelText(en.portalRaise.subject)).not.toBeInTheDocument();

  // The intake, and nothing else. /tickets is the desk's route and refuses
  // anybody who is not staff; a screen that wrote a ticket by another path
  // would be the second write path the channel seam exists to prevent.
  expect(paths).toEqual(['/api/v1/intake/web/tickets']);
  expect(sent).toEqual([
    {
      email: 'stranger@example.com',
      name: 'A Stranger',
      subject: 'The invoice is wrong',
      body: 'It says 400 and should say 40.',
    },
  ]);
});

test('it sends no token, because there is none to send', async () => {
  const { headers } = stub();
  render();

  await fill();
  await screen.findByText(TICKET.id);

  // A stranger has no session. If this ever carried an Authorization header it
  // would mean the page had been moved inside the authenticated shell.
  expect(Object.keys(headers[0]).map((k) => k.toLowerCase())).not.toContain('authorization');
});

test('a blank name is absent from the request, not an empty one', async () => {
  const { sent } = stub();
  render();

  await fill({ name: '' });
  await screen.findByText(TICKET.id);

  // Identity resolution takes the name only to fill a new customer's row, and
  // an empty string there would be a name.
  expect('name' in sent[0]).toBe(false);
});

test('a field the API named is marked, with the shared sentence', async () => {
  stub(() => json({ code: 'VALIDATION_FAILED', fields: ['email'] }, 422));
  render();

  await fill({ email: 'not-an-address' });

  const email = await screen.findByLabelText(en.portalRaise.email);
  // waitFor, not a bare assertion after findBy: the input exists from the
  // first paint, so findBy returns before the refusal has landed.
  await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'));
  expect(screen.getByRole('alert')).toHaveTextContent(en.errors.VALIDATION_FAILED);
  expect(screen.getByLabelText(en.portalRaise.subject)).not.toHaveAttribute('aria-invalid');
  // The mark carries it; a banner repeating it says nothing more.
  expect(screen.queryByText(en.portalRaise.failed)).not.toBeInTheDocument();
});

test('a throttled request says so in words a stranger can act on', async () => {
  stub(() => json({ code: 'RATE_LIMITED' }, 429));
  render();

  await fill();

  expect(await screen.findByText(en.portalRaise.tooMany)).toBeInTheDocument();
  // NOT the shared sentence. That one says "Too many attempts", told to
  // somebody who may have made exactly one: the intake counts every arrival
  // from a network address, so a first-time visitor can meet the ceiling
  // because of somebody else behind the same connection.
  expect(screen.queryByText(en.errors.RATE_LIMITED)).not.toBeInTheDocument();
});

test('a channel the system does not implement is not a sentence about the form', async () => {
  stub(() => json({ code: 'INTERNAL' }, 500));
  render();

  await fill();

  expect(await screen.findByText(en.portalRaise.failed)).toBeInTheDocument();
  expect(screen.getByText(en.errors.INTERNAL)).toBeInTheDocument();
});

test('a second press while the first is in flight is not a second ticket', async () => {
  let release: (value: Response) => void = () => {};
  const pending = new Promise<Response>((resolve) => {
    release = resolve;
  });
  const fetch = vi.fn(() => pending);
  vi.stubGlobal('fetch', fetch);
  render();

  await fill();
  const busy = await screen.findByRole('button', { name: en.portalRaise.submitting });
  expect(busy).toBeDisabled();
  await userEvent.click(busy, { pointerEventsCheck: 0 });
  expect(fetch).toHaveBeenCalledTimes(1);

  release(json(TICKET, 201));
  expect(await screen.findByText(TICKET.id)).toBeInTheDocument();
});

test('sending another starts from a blank form', async () => {
  stub();
  render();

  await fill();
  await screen.findByText(TICKET.id);
  await userEvent.click(screen.getByRole('button', { name: en.portalRaise.another }));

  expect(await screen.findByLabelText(en.portalRaise.email)).toHaveValue('');
  expect(screen.getByLabelText(en.portalRaise.subject)).toHaveValue('');
  expect(screen.queryByText(TICKET.id)).not.toBeInTheDocument();
});

test('it is reachable with no session, and shows none of the desk', async () => {
  stub();
  renderWithProviders(<AppRoutes />, { route: '/raise' });

  expect(
    await screen.findByRole('heading', { name: en.portalRaise.title }),
  ).toBeInTheDocument();
  // Not redirected to sign-in, and not wrapped in the shell: the desk's
  // navigation would offer a stranger four screens they cannot open.
  expect(screen.queryByRole('navigation', { name: en.shell.navLabel })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: en.shell.navQueue })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: en.signIn.heading })).not.toBeInTheDocument();
});

test('every string comes from the resource file, in both languages', async () => {
  stub();
  render('ar');

  expect(
    await screen.findByRole('heading', { name: ar.portalRaise.title }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(ar.portalRaise.email)).toBeInTheDocument();
  expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  expect(ar.portalRaise.title).not.toBe(en.portalRaise.title);
});
