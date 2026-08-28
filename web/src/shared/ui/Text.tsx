import type { ReactNode } from 'react';

import './Text.css';

// Body copy at the one body size. A screen that needs a different size asks
// for a Heading; it does not restate the scale.
export function Text({ children, variant }: { children: ReactNode; variant?: 'muted' }) {
  return <p className={['text', variant && `text--${variant}`].filter(Boolean).join(' ')}>{children}</p>;
}
