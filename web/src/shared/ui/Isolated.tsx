import type { ReactNode } from 'react';

// Text whose own direction must not be decided by the paragraph around it.
//
// A phone number is a left-to-right run — digits, spaces and a leading `+` —
// and inside an Arabic paragraph the browser reorders it: +20 2 5555 0177
// renders as 0177 5555 2 20+, with the plus at the far end and the groups
// backwards. That is the Unicode bidi algorithm working correctly on text
// nobody told it to isolate, and it makes every phone number on the customers
// screen wrong in one of the two languages this product ships in.
//
// <bdi> is the element for exactly this: it isolates its content so the
// surrounding direction cannot reorder it, and — unlike a hard `dir="ltr"` —
// it still lets the content decide its own direction, so an Arabic value
// inside stays right-to-left.
//
// It belongs in the library rather than at one call site because the next
// screen showing a number, an id, an address or a code has the same problem
// and will not think of it either.
export function Isolated({ children }: { children: ReactNode }) {
  return <bdi>{children}</bdi>;
}
