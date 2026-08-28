import { beforeEach, vi } from 'vitest';

import '@testing-library/jest-dom/vitest';

// The web suite's harness. It provides three things, and each is here because
// the default would be wrong rather than merely inconvenient:
//
//   1. A memory-backed localStorage. Node 26 defines a global that throws
//      unless the runtime is started with a flag, and jsdom's returns
//      undefined. Neither is usable.
//   2. A fetch that fails loudly. The suite must run with no network, so an
//      unstubbed call is a bug in the test, and the error names the call
//      instead of hanging or reaching the internet.
//   3. A reset before every test, so a stub or a stored token from one test
//      cannot decide the outcome of the next.
class MemoryStorage implements Storage {
  private entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }
  clear(): void {
    this.entries.clear();
  }
  getItem(key: string): string | null {
    return this.entries.has(key) ? (this.entries.get(key) as string) : null;
  }
  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.entries.delete(key);
  }
  setItem(key: string, value: string): void {
    this.entries.set(key, String(value));
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  writable: true,
  configurable: true,
});

// A test that needs a response stubs fetch for itself with vi.stubGlobal; the
// reset below puts this back afterwards. An unstubbed call names the request
// that made it, because "fetch failed" three files away is not a clue.
class TestNetworkAccessError extends Error {
  constructor(method: string, url: string) {
    super(`unstubbed fetch call in test: ${method} ${url}`);
    this.name = 'TestNetworkAccessError';
  }
}

function refuseNetwork(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  throw new TestNetworkAccessError(init?.method ?? 'GET', url);
}

beforeEach(() => {
  // Every test starts from an empty store and an unstubbed world, so no test
  // has to remember to clean up after itself for the next one to be correct.
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.stubGlobal('fetch', refuseNetwork);
});

vi.stubGlobal('fetch', refuseNetwork);
