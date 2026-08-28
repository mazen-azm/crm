import type { ReactNode } from 'react';

import './Card.css';

// A surface. Everything about it — background, border, radius, padding —
// is a token, so one change to the palette moves every card.
export function Card({ children }: { children: ReactNode }) {
  return <div className="card">{children}</div>;
}
