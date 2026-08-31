import { ErrorState } from '../../shared/ui';
import { useTranslation } from '../../shared/i18n';

// One answer for one cause.
//
// Three controls on the queue row write to a ticket, and all three can be
// refused for the same reason: somebody else changed it first. They had three
// copies of this block and three sentences — two alike and one that had
// already drifted to "reading" from "looking at", with the category control
// borrowing the assign control's button label because nobody had given it one.
//
// Three sentences for one cause teach somebody that there are three causes. So
// the sentence lives in one place, and so does the block that shows it: a
// shared string with three copies of the markup around it is the same drift
// one commit later.
//
// 409 is not "something went wrong". Nothing is broken and nothing was lost —
// somebody else got there first, and the only useful next action is to look
// again.
export function StaleTicket() {
  const { t } = useTranslation();

  return (
    <ErrorState
      title={t.ticketStale.title}
      body={t.errors.REVISION_MISMATCH}
      // Blunt, and the same bluntness everywhere. The row cannot re-fetch one
      // ticket — there is no route that reads one for the desk — so a reload
      // is the honest recovery rather than a partial one that leaves the other
      // controls holding the revision this one just learned was stale.
      onRetry={() => window.location.reload()}
      retryLabel={t.ticketStale.reload}
    />
  );
}
