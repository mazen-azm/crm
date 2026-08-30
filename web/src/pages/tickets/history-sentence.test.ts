// Proves the first criterion of scripts/criteria/tickets.md section
// TICKETS-7-WEB: an entry reads as a sentence, in the reader's language,
// built from a resource file and never from the verb.
import { expect, test } from 'vitest';

import { historySentence } from './history-sentence';
import type { HistoryEntry } from './useTicketHistory';
import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';

const NAMES: Record<string, string> = { 'u-1': 'Sofia', 'u-2': 'Karim' };
const nameOf = (t: typeof en) => (id: string | null) =>
  id === null ? t.ticketHistory.systemActor : (NAMES[id] ?? id);

const entry = (over: Partial<HistoryEntry>): HistoryEntry => ({
  id: 'a-1',
  actorId: 'u-1',
  verb: 'ticket.status',
  at: '2026-08-30T09:00:00.000Z',
  before: null,
  after: null,
  ...over,
});

test('a status move names both statuses in words, not wire values', () => {
  const line = historySentence(
    entry({ before: { status: 'new' }, after: { status: 'open' } }),
    { t: en, nameOf: nameOf(en) },
  );

  expect(line).toBe('Sofia moved this from New to Open.');
  // The wire value never reaches the reader, and neither does the verb.
  expect(line).not.toContain('ticket.status');
  expect(line).not.toContain('new');
});

test('the Arabic sentence is its own sentence, not the English one translated word by word', () => {
  const same = entry({ before: { status: 'new' }, after: { status: 'open' } });

  const english = historySentence(same, { t: en, nameOf: nameOf(en) });
  const arabic = historySentence(same, { t: ar, nameOf: nameOf(ar as unknown as typeof en) });

  expect(arabic).toBe('نقل Sofia هذه التذكرة من جديدة إلى مفتوحة.');
  // The actor opens the English sentence and follows the verb in the Arabic
  // one. That difference is the whole reason a template owns the word order
  // rather than the code that fills it.
  expect(english.startsWith('Sofia')).toBe(true);
  expect(arabic.startsWith('Sofia')).toBe(false);
});

test('one verb, three sentences — an assignment is read from the diff', () => {
  const of = (before: string | null, after: string | null) =>
    historySentence(
      entry({ verb: 'ticket.assign', before: { assigneeId: before }, after: { assigneeId: after } }),
      { t: en, nameOf: nameOf(en) },
    );

  expect(of(null, 'u-2')).toBe('Sofia assigned this to Karim.');
  expect(of('u-2', null)).toBe('Sofia took this off Karim.');
  expect(of('u-2', 'u-1')).toBe('Sofia moved this from Karim to Sofia.');
});

test('a ticket being raised reads as that', () => {
  const line = historySentence(
    entry({ verb: 'ticket.create', after: { status: 'new', priority: 'normal' } }),
    { t: en, nameOf: nameOf(en) },
  );
  expect(line).toBe('Sofia raised this ticket.');
});

test('nobody acted means the system acted, and no name is invented', () => {
  const line = historySentence(
    entry({ actorId: null, verb: 'ticket.create' }),
    { t: en, nameOf: nameOf(en) },
  );
  expect(line).toBe('the system raised this ticket.');
});

test('a verb written before its sentence still reads as something', () => {
  const line = historySentence(entry({ verb: 'ticket.merge' }), { t: en, nameOf: nameOf(en) });

  // Legible, and it names the verb so whoever added it can see what is
  // missing. Not a blank row, and not a crash.
  expect(line).toBe('Sofia did something recorded as ticket.merge.');
});

test('a slot the diff cannot fill leaves nothing behind, not a brace', () => {
  const line = historySentence(
    entry({ verb: 'ticket.status', before: null, after: null }),
    { t: en, nameOf: nameOf(en) },
  );

  expect(line).not.toContain('{');
  expect(line).toContain('Sofia');
});
