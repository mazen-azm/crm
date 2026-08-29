import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';

import './Input.css';

// Deliberately not a new look: it borrows Input.css so a select and a text
// input on the same form are the same height and the same border. A separate
// stylesheet would be two things to keep in step for no gain.
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...rest }, ref) {
    return <select ref={ref} className={['input', className].filter(Boolean).join(' ')} {...rest} />;
  },
);
