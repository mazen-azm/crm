import type { ReactNode } from 'react';

import { Button } from './Button';
import { Heading } from './Heading';
import { Stack } from './Stack';
import { Text } from './Text';
import './ErrorState.css';

// A failed load shows what the API actually said and offers the way back.
// The body is the sentence for the documented code — the client surfaces the
// code's meaning rather than replacing it with "something went wrong", which
// throws away the only thing the API promised to tell us.
export function ErrorState({
  title,
  body,
  onRetry,
  retryLabel,
}: {
  title: ReactNode;
  body: ReactNode;
  onRetry?: () => void;
  retryLabel?: ReactNode;
}) {
  return (
    <div className="error-state" role="alert">
      <Stack gap={3} align="start">
        <Heading level={2}>{title}</Heading>
        <Text variant="muted">{body}</Text>
        {/* No retry button when the caller gave no way to retry. An offer
            that does nothing is worse than no offer. */}
        {onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </Stack>
    </div>
  );
}
