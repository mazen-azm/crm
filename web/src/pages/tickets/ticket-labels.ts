import type { useTranslation } from '../../shared/i18n';

// A status and a priority as words a person reads, in one place.
//
// They were inside TicketQueuePage. Two screens now show a ticket, and two
// copies of a mapping disagree the first time one word changes — which is the
// kind of drift nobody notices, because both screens look right on their own.
//
// The `?? value` fallback is deliberate: a status the resource files have no
// word for renders as itself rather than blank. A new status will reach a
// screen before its translation does.
type T = ReturnType<typeof useTranslation>['t'];

export const statusLabel = (t: T, status: string): string =>
  ({
    new: t.ticketQueue.statusNew,
    open: t.ticketQueue.statusOpen,
    pending: t.ticketQueue.statusPending,
    resolved: t.ticketQueue.statusResolved,
    closed: t.ticketQueue.statusClosed,
    reopened: t.ticketQueue.statusReopened,
  })[status] ?? status;

export const priorityLabel = (t: T, priority: string): string =>
  ({
    low: t.ticketQueue.priorityLow,
    normal: t.ticketQueue.priorityNormal,
    high: t.ticketQueue.priorityHigh,
    urgent: t.ticketQueue.priorityUrgent,
  })[priority] ?? priority;
