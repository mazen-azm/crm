// Proves the L-51 half of scripts/criteria/reports.md section REPORTS-2-WEB.
import { expect, test } from 'vitest';

import { en } from '../../shared/i18n/en';
import { ar } from '../../shared/i18n/ar';
import { shareSentence } from './promise-share-sentence';

const FSI = '⁨';
const PDI = '⁩';

test('the share and both counts are slots, not a string glued together', () => {
  const sentence = shareSentence({ share: '82%', met: '41', settled: '50' }, { t: en });

  expect(sentence).toContain('82%');
  expect(sentence).toContain('41');
  expect(sentence).toContain('50');
  // Each value isolated. A percentage and a pair of counts are left-to-right
  // runs, and without the isolate the bidi algorithm takes the punctuation
  // around them as part of the run and moves it.
  for (const value of ['82%', '41', '50']) {
    expect(sentence).toContain(`${FSI}${value}${PDI}`);
  }
});

test('the Arabic sentence is its own sentence, not the English one with words swapped', () => {
  const sentence = shareSentence({ share: '٨٢٪', met: '٤١', settled: '٥٠' }, { t: ar });

  expect(sentence).toContain(`${FSI}٨٢٪${PDI}`);
  expect(sentence).toContain(`${FSI}٥٠${PDI}`);
  // The word between the two counts is Arabic, from the Arabic template. A
  // sentence assembled by concatenation would put an English "of" here and
  // read correctly in English and as nonsense in Arabic.
  expect(sentence).toContain('من');
  expect(sentence).not.toContain(' of ');
});

test('a slot the caller did not fill leaves nothing behind', () => {
  // The templates are data in a resource file; a missing slot must not put
  // `{settled}` on a screen.
  const sentence = shareSentence(
    { share: '0%', met: '0', settled: '' } as never,
    { t: en },
  );
  expect(sentence).not.toContain('{');
});
