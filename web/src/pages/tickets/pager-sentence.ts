import type { useTranslation } from '../../shared/i18n';
import type { ThreadPage } from './useTicketThread';

type T = ReturnType<typeof useTranslation>['t'];

// The same shape as history-sentence.ts, and for the same reason: a whole
// sentence per language with named slots, never a number glued to a word. "of"
// has no Arabic equivalent that sits between two numerals in that order, and a
// sentence built by concatenation reads correctly in English and as nonsense
// in Arabic.
//
// The isolate is not decoration. A page number is a left-to-right run inside a
// right-to-left paragraph, and without it the bidi algorithm takes the
// following punctuation as part of the run and moves it (L-51).
const isolate = (value: string) => `⁨${value}⁩`;

const fill = (template: string, slots: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => (key in slots ? isolate(slots[key]) : ''));

// Where the reader is, in messages rather than in pages.
//
// Pages would be a number the screen invented: the API answers with a window,
// and "messages 21–40 of 47" is what it actually said. It also survives a page
// size the server changes, which a page count does not — page 3 of 3 becomes
// page 2 of 2 with no message having moved.
export function pagerSentence(page: ThreadPage, { t, atNewest }: { t: T; atNewest: boolean }) {
  const slots = {
    from: String(page.offset + 1),
    to: String(page.offset + page.items.length),
    total: String(page.total),
  };
  // The landing page says it is the newest, because that is the decision this
  // screen made on the reader's behalf and an unexplained one reads as a fault.
  return fill(atNewest ? t.ticketThread.showingNewest : t.ticketThread.showing, slots);
}
