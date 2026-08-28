import type { InputHTMLAttributes } from 'react';

import { Input } from './Input';
import './Field.css';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
};

// Label, input and the message that belongs to them, wired together so the
// label points at the input and the error is announced with it.
export function Field({ id, label, error, ...rest }: FieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <Input id={id} aria-invalid={error ? true : undefined} aria-describedby={errorId} {...rest} />
      {error ? (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
