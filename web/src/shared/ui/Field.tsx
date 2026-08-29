import type { InputHTMLAttributes, ReactNode } from 'react';

import { Input } from './Input';
import './Field.css';

// `children` is omitted from the native props before being redefined: an
// input's own children type is a string, and intersecting the two gives
// `string & (control) => ReactNode`, which nothing can satisfy.
type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'children'> & {
  id: string;
  label: string;
  error?: string;
  // A control that is not a text input — a select, a textarea. The label, the
  // error and the aria wiring are the same for all of them, so they are done
  // once here rather than three times at the call sites. `describedBy` is
  // passed back so the control can point at the error message the way the
  // built-in Input does.
  children?: (control: { id: string; describedBy?: string; invalid?: true }) => ReactNode;
};

// Label, control and the message that belongs to them, wired together so the
// label points at the control and the error is announced with it.
export function Field({ id, label, error, children, ...rest }: FieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const invalid = error ? (true as const) : undefined;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children ? (
        children({ id, describedBy: errorId, invalid })
      ) : (
        <Input id={id} aria-invalid={invalid} aria-describedby={errorId} {...rest} />
      )}
      {error ? (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
