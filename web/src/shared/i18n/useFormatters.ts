import { useMemo } from 'react';

import { useTranslation } from './index';
import { formatDate, formatNumber, formatRelativeTime, plural, formsOf } from './format';
import type { CountKeys } from './format';

// The formatters with the active language already bound, so a screen does not
// pass it at every call site and cannot pass the wrong one. useTranslation
// already carries the language; this adds no second accessor for that context.
export function useFormatters() {
  const { language } = useTranslation();

  return useMemo(
    () => ({
      formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
        formatDate(value, language, options),
      formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
        formatNumber(value, language, options),
      formatRelativeTime: (
        value: number,
        unit: Intl.RelativeTimeFormatUnit,
        options?: Intl.RelativeTimeFormatOptions,
      ) => formatRelativeTime(value, unit, language, options),
      // The number and its noun together, so a caller cannot render the count
      // in one language's digits and pick the plural form in another's rules.
      countOf: (value: number, keys: CountKeys) =>
        `${formatNumber(value, language)} ${plural(value, formsOf(keys), language)}`,
    }),
    [language],
  );
}
