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
