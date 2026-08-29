import type { ReactNode } from 'react';

import { Heading } from './Heading';
import { Stack } from './Stack';
import { Text } from './Text';
import './EmptyState.css';

// A list with no rows says why it is empty and what to do next. A blank
// region says neither, and reads as a page that failed quietly.
//
// Text comes in as props: this file has no sentence of its own, so it is the
// caller — a screen, whose strings the guard already scans — that has to reach
// for the resource file.
export function EmptyState({
  title,
  body,
  action,
}: {
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Stack gap={3} align="start">
        <Heading level={2}>{title}</Heading>
        {body ? <Text variant="muted">{body}</Text> : null}
        {action}
      </Stack>
    </div>
  );
}
