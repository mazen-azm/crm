import type { ButtonHTMLAttributes } from 'react';

import './Button.css';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

// A native button. Colour, radius and spacing come from tokens; the component
// states no value of its own.
export function Button({ variant = 'primary', className, type = 'button', ...rest }: ButtonProps) {
  const classes = ['button', `button--${variant}`, className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...rest} />;
}
