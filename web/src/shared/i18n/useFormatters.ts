import { useMemo } from 'react';

import { useTranslation } from './index';
import { formatDate, formatNumber, formatRelativeTime } from './format';

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
    }),
    [language],
  );
}
