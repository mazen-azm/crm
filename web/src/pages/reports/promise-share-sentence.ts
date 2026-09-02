import type { useTranslation } from '../../shared/i18n';

type T = ReturnType<typeof useTranslation>['t'];

// The same shape as pager-sentence.ts and history-sentence.ts, and for the same
// reason: a whole sentence per language with named slots, never a number glued
// to a word.
//
// The isolate is not decoration. A percentage and a pair of counts are
// left-to-right runs inside a right-to-left paragraph, and without it the bidi
// algorithm takes the surrounding brackets as part of the run and moves them
// (L-51).
const isolate = (value: string) => `⁨${value}⁩`;

const fill = (template: string, slots: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => (key in slots ? isolate(slots[key]) : ''));

// One template, three slots — not a counts sentence nested inside a share
// sentence. `fill` isolates every value it substitutes, so a pre-filled
// sentence passed in as a slot arrives already isolated and is isolated again.
export function shareSentence(
  { share, met, settled }: { share: string; met: string; settled: string },
  { t }: { t: T },
) {
  return fill(t.promiseReport.result, { share, met, settled });
}
