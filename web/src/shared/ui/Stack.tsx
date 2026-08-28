import type { ReactNode } from 'react';

import './Stack.css';

type StackProps = {
  children: ReactNode;
  direction?: 'row' | 'column';
  gap?: 1 | 2 | 3 | 4 | 5 | 6;
  align?: 'start' | 'end';
  as?: 'div' | 'form' | 'main' | 'section';
};

// Spacing between things, from the scale and only from the scale. A screen
// assembled from primitives never writes a margin.
export function Stack({ children, direction = 'column', gap = 4, align, as: Tag = 'div', ...rest }: StackProps & { onSubmit?: React.FormEventHandler }) {
  const classes = [
    'stack',
    `stack--${direction}`,
    `stack--gap-${gap}`,
    align && `stack--align-${align}`,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
