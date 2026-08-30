import type { Language } from './index';

// Measured on this repository's Node 26, which ships full ICU:
//
//   'ar'              → 1,234,567.89   Latin digits
//   'ar-EG'           → ١٬٢٣٤٬٥٦٧٫٨٩   Arabic-Indic digits, Arabic grouping
//   'ar-EG-u-nu-latn' → 1,234,567.89   opts back out of the digit script
//
// The acceptance criterion says a number's DIGITS and its grouping follow the
// locale, so bare 'ar' does not satisfy it. That is the whole reason this
// mapping exists — do not "simplify" it back to the language code.
export const localeTag = (language: Language): string => (language === 'ar' ? 'ar-EG' : 'en');

// Timezone: the browser's own, by default. Storage is UTC (BR-3) — the API
// stamps `new Date(now() * 1000).toISOString()` — and display is the reader's
// zone. A support desk with SLA clocks may later want one fixed zone for
// everybody so two people reading the same breach see the same hour; that is a
// decision nobody has made yet, and a caller who already knows the zone can
// pass one through `options`.
export function formatDate(
  value: string | number | Date,
  language: Language,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(localeTag(language), options).format(date);
}

export function formatNumber(
  value: number,
  language: Language,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(localeTag(language), options).format(value);
}

/**
 * A duration in the reader's language. Negative is the past, positive the
 * future, per the Intl specification: `formatRelativeTime(-3, 'hour', 'ar')`
 * is "قبل 3 ساعات".
 *
 * These sentences deliberately do NOT come from the dictionaries. BR-6 governs
 * copy this product writes; this is copy the platform writes, and it already
 * handles Arabic's dual and plural forms. Adding hoursAgo/minutesAgo keys would
 * be re-implementing a pluralisation engine that is built in.
 */
export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  language: Language,
  options: Intl.RelativeTimeFormatOptions = { numeric: 'auto' },
): string {
  return new Intl.RelativeTimeFormat(localeTag(language), options).format(value, unit);
}

// A count and its noun, in the shape the language actually needs.
//
// "1 tickets" is what a template that glues a number to a fixed plural
// produces, and English is the easy case: Arabic has six categories and uses
// four of them for small numbers — one تذكرة, two تذكرتان, a few تذاكر, many
// تذكرة again. Intl.PluralRules knows all of that, so the resource files
// supply the forms and none of this is decided in a component.
//
// A form the language does not use is simply absent from the object; `other`
// is the fallback every locale defines.
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

export function plural(count: number, forms: PluralForms, language: string): string {
  const rule = new Intl.PluralRules(language).select(count);
  return forms[rule] ?? forms.other;
}

// Every value in a resource file is a string — Messages says so and
// defineLocale's key check depends on it — so the forms arrive as separate
// keys and are gathered here rather than stored as an object.
export type CountKeys = {
  resultCountOne: string;
  resultCountTwo: string;
  resultCountFew: string;
  resultCountMany: string;
  resultCount: string;
};

export const formsOf = (k: CountKeys): PluralForms => ({
  one: k.resultCountOne,
  two: k.resultCountTwo,
  few: k.resultCountFew,
  many: k.resultCountMany,
  other: k.resultCount,
});
