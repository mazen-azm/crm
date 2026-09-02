// Proves scripts/criteria/identity.md section IDENTITY-2-WEB.
import { afterEach, expect, test, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor, within } from '../../testing/render';
import { AppRoutes } from '../../app/routes';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';

const json = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const LIVE = {
  id: 'u-1',
  email: 'nadia@support-desk.local',
  name: 'Nadia Haddad',
  role: 'admin',
  createdAt: '2026-08-01T09:00:00.000Z',
  updatedAt: '2026-08-01T09:00:00.000Z',
  deletedAt: null,
};

const GONE = {
  id: 'u-2',
  email: 'omar@support-desk.local',
  name: 'Omar Aziz',
  role: 'agent',
  createdAt: '2026-08-02T09:00:00.000Z',
  updatedAt: '2026-08-20T09:00:00.000Z',
  deletedAt: '2026-08-20T09:00:00.000Z',
};

type Answer = () => Response;

function desk({
  role = 'admin',
  live = [LIVE],
  disabled = [GONE],
  create,
  disable,
  reEnable,
  pageOf,
}: {
  role?: string;
  live?: unknown[];
  disabled?: unknown[];
  create?: Answer;
  disable?: Answer;
  reEnable?: Answer;
  // For the one test that needs a total larger than the page it is given.
  pageOf?: (items: unknown[], state: string) => Answer;
} = {}) {
  const asked: string[] = [];
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://desk.test');
    const method = init?.method ?? 'GET';

    if (url.pathname === '/api/v1/me') {
      return Promise.resolve(json({ id: 'u-1', role, name: 'Nadia Haddad' })());
    }
    if (url.pathname === '/api/v1/accounts' && method === 'GET') {
      asked.push(url.search);
      const state = url.searchParams.get('state') ?? 'live';
      const items = state === 'disabled' ? disabled : state === 'all' ? [...live, ...disabled] : live;
      const answer = pageOf ?? ((rows: unknown[], which: string) =>
        json({ items: rows, total: (rows as unknown[]).length, limit: 20, offset: 0, state: which }));
      return Promise.resolve(answer(items, state)());
    }
    if (url.pathname === '/api/v1/accounts' && method === 'POST') {
      return Promise.resolve((create ?? json({ user: LIVE, initialPassword: 'k7-sprint-secret' }, 201))());
    }
    if (url.pathname.endsWith('/disable')) {
      return Promise.resolve((disable ?? json({ user: GONE, unassigned: 3 }))());
    }
    if (url.pathname.endsWith('/re-enable')) {
      return Promise.resolve((reEnable ?? json({ user: LIVE }))());
    }
    throw new Error(`this screen must not call ${method} ${url.pathname}`);
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, asked };
}

afterEach(() => vi.unstubAllGlobals());

const open = (route = '/accounts', language?: 'en' | 'ar') =>
  renderWithProviders(<AppRoutes />, { signedIn: true, route, language });

// Assertions about a person are scoped to that person's row. The role words
// appear twice on this screen on purpose — once as a choice in the create form
// and once as a fact about somebody — and a bare getByText cannot tell the
// offer from the record.
// Every value in every store the browser gives this page, as one string. Not a
// spy on a setter: what matters is whether the secret is readable afterwards,
// and by whom it was written is beside the point.
const everythingStored = () => {
  const values: string[] = [];
  for (const store of [globalThis.localStorage, globalThis.sessionStorage]) {
    if (!store) continue;
    try {
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (key !== null) values.push(key, store.getItem(key) ?? '');
      }
    } catch {
      // A store that refuses to be read has nothing readable in it.
    }
  }
  return values.join(' ');
};

const rowFor = async (name: string) => within((await screen.findByText(name)).closest('tr')!);

test('an admin sees the accounts, with their role and their state', async () => {
  desk();
  open();

  const nadia = await rowFor('Nadia Haddad');
  // The role is a word from the resource file, never the raw `admin`.
  expect(nadia.getByText(en.accounts.roleAdmin)).toBeInTheDocument();
  expect(nadia.getByText(en.accounts.stateLive)).toBeInTheDocument();
  expect(nadia.queryByText('admin')).not.toBeInTheDocument();
});

// The reason this story exists. Nothing in the API listed a disabled account,
// so re-enable took an id no client could learn (L-66).
test('the disabled accounts are reachable, and each offers the verb that brings it back', async () => {
  const { asked } = desk();
  open();
  await screen.findByText('Nadia Haddad');

  await userEvent.selectOptions(screen.getByLabelText(en.accounts.showLabel), 'disabled');

  await waitFor(() => expect(asked.at(-1)).toContain('state=disabled'));
  const omar = await rowFor('Omar Aziz');
  expect(omar.getByText(en.accounts.stateDisabled)).toBeInTheDocument();
  // A live row offers disable; a disabled row offers the way back.
  expect(screen.getByRole('button', { name: en.accounts.reEnable })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: en.accounts.disable })).not.toBeInTheDocument();
});

test('re-enabling puts the account back among the live', async () => {
  const { fetch, asked } = desk();
  open('/accounts?state=disabled');
  await screen.findByText('Omar Aziz');

  await userEvent.click(screen.getByRole('button', { name: en.accounts.reEnable }));

  // The id came off the listing — which is the whole point of the story, since
  // nothing else in this product could supply it (L-66).
  await waitFor(() =>
    expect(fetch.mock.calls.some(([input]) =>
      String(input).includes(`/accounts/${GONE.id}/re-enable`))).toBe(true));
  // And the list is asked again, so the row is not left saying something that
  // stopped being true when the button was pressed.
  await waitFor(() => expect(asked.length).toBeGreaterThan(1));
});

test('a list longer than a page is paged, and the first page cannot go back', async () => {
  const many = Array.from({ length: 20 }, (_, i) => ({ ...LIVE, id: `u-${i}`, name: `Person ${i}` }));
  const { asked } = desk({ live: many, pageOf: (items, state) =>
    json({ items, total: 41, limit: 20, offset: 0, state }) });
  open();
  await screen.findByText('Person 0');

  // Nothing older to go back to on the first page.
  expect(screen.getByRole('button', { name: en.accounts.newer })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: en.accounts.older }));
  await waitFor(() => expect(asked.at(-1)).toContain('offset=20'));
});

test('the chosen state is in the address, so the view can be sent to somebody', async () => {
  const { asked } = desk();
  open('/accounts?state=all');

  await waitFor(() => expect(asked.at(-1)).toContain('state=all'));
  expect(await screen.findByText('Omar Aziz')).toBeInTheDocument();
});

test('the form offers the two roles an admin may hand out, and not the third', async () => {
  desk();
  open();
  await screen.findByText('Nadia Haddad');

  const select = await screen.findByLabelText(en.accounts.addRole);
  const offered = Array.from(select.querySelectorAll('option')).map((each) => each.textContent);
  expect(offered).toEqual([en.accounts.roleAgent, en.accounts.roleAdmin]);
  // `customer` is a real role and is not one this route creates. Offering it
  // would teach a rule that is not true and earn a 422 for believing it.
  expect(offered).not.toContain('customer');
});

test('the password a new account is given is shown once, and written nowhere it can be read again', async () => {
  desk();
  // The spies are on `console` only. Storage is checked by reading what is IN
  // it afterwards, not by watching a method: this suite replaces localStorage
  // with its own MemoryStorage (testing/setup.ts), so a spy on
  // Storage.prototype.setItem watches something nothing calls — it was written
  // that way first and a mutation that stored the password walked straight
  // past it. Asserting on the contents catches every way of getting a value in
  // there, including the ones nobody thought of.
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const errored = vi.spyOn(console, 'error').mockImplementation(() => {});
  open();
  await screen.findByText('Nadia Haddad');

  await userEvent.type(screen.getByLabelText(en.accounts.addName), 'New Person');
  await userEvent.type(screen.getByLabelText(en.accounts.addEmail), 'new@support-desk.local');
  await userEvent.click(screen.getByRole('button', { name: en.accounts.add }));

  // Shown, plainly. An admin who never sees it has created an account nobody
  // can sign in to.
  expect(await screen.findByText('k7-sprint-secret')).toBeInTheDocument();
  expect(screen.getByText(en.accounts.passwordRead)).toBeInTheDocument();

  // And nowhere else. The audit row for user.create deliberately carries
  // neither the password nor its hash; a screen that stored it would undo that.
  for (const spy of [log, warn, errored]) {
    expect(spy.mock.calls.flat().join(' ')).not.toContain('k7-sprint-secret');
  }
  expect(everythingStored()).not.toContain('k7-sprint-secret');
  expect(window.location.href).not.toContain('k7-sprint-secret');

  // Dismissing puts it out of reach, because nothing can show it again.
  await userEvent.click(screen.getByRole('button', { name: en.accounts.passwordDone }));
  await waitFor(() => expect(screen.queryByText('k7-sprint-secret')).not.toBeInTheDocument());

  log.mockRestore();
  warn.mockRestore();
  errored.mockRestore();
});

test('a disable says how much work it handed back, including when it is none', async () => {
  desk();
  open();
  await screen.findByText('Nadia Haddad');

  await userEvent.click(screen.getByRole('button', { name: en.accounts.disable }));
  // The API returns the count beside the user so an admin can see what
  // happened to the work. Three, in the reader's digits.
  expect(await screen.findByText(/3 tickets were handed back/)).toBeInTheDocument();

  vi.unstubAllGlobals();
  desk({ disable: json({ user: GONE, unassigned: 0 }) });
  open();
  await screen.findByText('Nadia Haddad');
  await userEvent.click(screen.getByRole('button', { name: en.accounts.disable }));
  // Zero is an answer, not an omission — and it is a different sentence,
  // because "0 tickets were handed back" is a thing nobody says.
  expect(await screen.findByText(en.accounts.unassignedNone)).toBeInTheDocument();
});

test('what the last action said does not outlive it', async () => {
  desk();
  open();
  await screen.findByText('Nadia Haddad');

  await userEvent.click(screen.getAllByRole('button', { name: en.accounts.disable })[0]);
  expect(await screen.findByText(/3 tickets were handed back/)).toBeInTheDocument();

  // Re-enable somebody, and the count from the disable must go. Left alone it
  // sits above a list where nothing was handed back — a sentence standing over
  // state it no longer describes. Found by opening the screen and pressing the
  // two buttons in order; no test was looking for it.
  await userEvent.selectOptions(screen.getByLabelText(en.accounts.showLabel), 'disabled');
  await userEvent.click(await screen.findByRole('button', { name: en.accounts.reEnable }));

  await waitFor(() =>
    expect(screen.queryByText(/tickets were handed back/)).not.toBeInTheDocument());
});

test('changing which accounts are shown clears it too', async () => {
  desk();
  open();
  await screen.findByText('Nadia Haddad');

  await userEvent.click(screen.getAllByRole('button', { name: en.accounts.disable })[0]);
  expect(await screen.findByText(/3 tickets were handed back/)).toBeInTheDocument();

  await userEvent.selectOptions(screen.getByLabelText(en.accounts.showLabel), 'disabled');

  // The sentence is about one person, and the list no longer contains them.
  await waitFor(() =>
    expect(screen.queryByText(/tickets were handed back/)).not.toBeInTheDocument());
});

test('each refusal says which rule refused it, not that something went wrong', async () => {
  desk({ disable: json({ code: 'LAST_ADMIN', requestId: 'r-1' }, 409) });
  open();
  await screen.findByText('Nadia Haddad');

  await userEvent.click(screen.getByRole('button', { name: en.accounts.disable }));
  expect(await screen.findByText(en.errors.LAST_ADMIN)).toBeInTheDocument();
  // Not the generic conflict sentence, which is about somebody else's edit and
  // is a different thing entirely.
  expect(screen.queryByText(en.errors.CONFLICT)).not.toBeInTheDocument();
});

test('an address that is taken points at re-enabling rather than at a second account', async () => {
  desk({ create: json({ code: 'EMAIL_TAKEN', requestId: 'r-2' }, 409) });
  open();
  await screen.findByText('Nadia Haddad');

  await userEvent.type(screen.getByLabelText(en.accounts.addName), 'Omar Aziz');
  await userEvent.type(screen.getByLabelText(en.accounts.addEmail), 'omar@support-desk.local');
  await userEvent.click(screen.getByRole('button', { name: en.accounts.add }));

  expect(await screen.findByText(en.errors.EMAIL_TAKEN)).toBeInTheDocument();
});

test('somebody who is not an admin is told so, and nothing is asked on their behalf', async () => {
  const { fetch } = desk({ role: 'agent' });
  open();

  expect(await screen.findByText(en.accounts.adminOnlyTitle)).toBeInTheDocument();
  // The refusal would have been correct and would have put a 403 in the audit
  // log for somebody who did nothing wrong (L-63).
  const paths = fetch.mock.calls.map((call) => new URL(String(call[0]), 'http://desk.test').pathname);
  expect(paths.filter((path) => path === '/api/v1/accounts')).toHaveLength(0);
});

test('the screen reads in Arabic too', async () => {
  desk();
  open('/accounts', 'ar');

  expect(await screen.findByText(ar.accounts.title)).toBeInTheDocument();
  const nadia = await rowFor('Nadia Haddad');
  expect(nadia.getByText(ar.accounts.roleAdmin)).toBeInTheDocument();
  expect(nadia.getByText(ar.accounts.stateLive)).toBeInTheDocument();
});
