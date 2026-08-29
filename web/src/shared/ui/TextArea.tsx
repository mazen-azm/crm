import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

import './Input.css';

// Same reasoning as Select: Input.css, plus the one thing a textarea needs
// that an input does not.
export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className, rows = 5, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={['input', 'input--multiline', className].filter(Boolean).join(' ')}
        {...rest}
      />
    );
  },
);
