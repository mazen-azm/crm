import { vi } from 'vitest';

// Who the signed-in person is, for a test that renders anything inside the
// desk shell.
//
// It exists because the shell asks the API. Until CUSTOMERS-6-API there was
// one kind of signed-in visitor and the shell drew the same navigation for
// everybody; now a customer must see none of the desk's screens, so the shell
// has to know which it is — and any test that renders it needs to say.
//
// Deliberately NOT folded into renderWithProviders. That helper mirrors
// App.tsx and stubs no network, which is what makes it honest about what a
// screen really does; a helper that quietly answered one endpoint would make
// the next unstubbed request the puzzle.
export type StubbedMe = { id?: string; role?: string; name?: string };

export function stubMe(me: StubbedMe = {}, rest?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const subject = { id: 'u-1', role: 'agent', name: 'Somebody', ...me };
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    if (new URL(String(input), 'http://desk.test').pathname === '/api/v1/me') {
      // A fresh Response per call: a body is read once (L-30).
      return Promise.resolve(
        new Response(JSON.stringify(subject), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    if (rest) return rest(input, init);
    throw new Error(`no stub for ${String(input)}`);
  });
  vi.stubGlobal('fetch', fetch);
  return { fetch, subject };
}
