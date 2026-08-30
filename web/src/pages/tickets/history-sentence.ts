import type { useTranslation } from '../../shared/i18n';
import { statusLabel } from './ticket-labels';
import type { HistoryEntry } from './useTicketHistory';

type T = ReturnType<typeof useTranslation>['t'];

// One WHOLE sentence per language per case, with named slots — never a verb
// glued to a value. "Sofia moved this from New to Open" and its Arabic form do
// not share a word order, so a sentence built by concatenation reads correctly
// in English and as nonsense in Arabic. The template owns the order; this only
// fills the holes.
const fill = (template: string, slots: Record<string, string>) =>
  // A slot the case did not supply becomes nothing rather than a literal
  // {toAssignee} on somebody's screen. The sentence still renders.
  template.replace(/\{(\w+)\}/g, (_match, name: string) => slots[name] ?? '');

// The API writes three verbs today: ticket.create, ticket.assign and
// ticket.status. An assignment is one verb covering three different sentences,
// because what happened is in the diff rather than in the name: given to
// somebody, taken off somebody, or moved between two people. Reading it off
// before/after keeps the API's vocabulary as it is instead of asking it for
// three verbs to save this function a branch.
//
// Anything else falls through to the unknown-verb line. The trail is
// append-only and a future story will write a verb before it writes a sentence
// for it; that entry has to read as something rather than as a blank row.
export function historySentence(
  entry: HistoryEntry,
  { t, nameOf }: { t: T; nameOf: (id: string | null) => string },
): string {
  const h = t.ticketHistory;
  const actor = nameOf(entry.actorId);
  const before = entry.before ?? {};
  const after = entry.after ?? {};

  if (entry.verb === 'ticket.create') {
    return fill(h.created, { actor });
  }

  if (entry.verb === 'ticket.status') {
    return fill(h.statusChanged, {
      actor,
      // Through the shared label map, so the trail says "Open" and not the
      // wire value — and says whatever the queue says, from one table.
      from: statusLabel(t, String(before.status ?? '')),
      to: statusLabel(t, String(after.status ?? '')),
    });
  }

  if (entry.verb === 'ticket.assign') {
    const from = before.assigneeId ?? null;
    const to = after.assigneeId ?? null;
    if (to === null) return fill(h.unassigned, { actor, from: nameOf(from) });
    if (from === null) return fill(h.assigned, { actor, to: nameOf(to) });
    return fill(h.reassigned, { actor, from: nameOf(from), to: nameOf(to) });
  }

  return fill(h.unknownVerb, { actor, verb: entry.verb });
}
