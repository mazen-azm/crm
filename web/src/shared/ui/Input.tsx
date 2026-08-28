import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

import './Input.css';

// A thin wrapper: it forwards a ref and every native prop, so a form library
// or a focus call later needs no escape hatch.
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={['input', className].filter(Boolean).join(' ')} {...rest} />;
  },
);
