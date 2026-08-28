import '@testing-library/jest-dom/vitest';

// Node 26 defines a localStorage global that throws unless the runtime is
// started with a flag, and jsdom's own returns undefined. Neither is usable,
// so the suite brings its own — a Map is enough, and a test can replace it.
//
// PLATFORM-11-WEB replaces this file with the full harness; this story ships
// only what its own criteria need.
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
