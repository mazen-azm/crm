import type { ReactNode } from 'react';

import './Heading.css';

// The level is the document outline and the size at once, so a screen cannot
// pick an h1 that looks like an h2.
export function Heading({ level = 1, children }: { level?: 1 | 2; children: ReactNode }) {
  const Tag = level === 1 ? 'h1' : 'h2';
  return <Tag className={`heading heading--${level}`}>{children}</Tag>;
}
