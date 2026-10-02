// src/components/ui/Input.jsx
import React from 'react';
import classNames from 'classnames';

/**
 * Input component with optional label and error state.
 * Props:
 *   label – string (optional)
 *   error – string (optional) – will render error message below input
 *   className – additional classes for the wrapper
 *   ...inputProps – passed to the underlying <input>
 */
export default function Input({ label, error, className = '', ...inputProps }) {
  const inputClass = classNames(
    'input',
    { 'border-danger-500 focus:border-danger-500 focus:ring-danger-500': !!error },
    className
  );

  return (
    <div className="space-y-1">
      {label && <label className="input-label">{label}</label>}
      <input className={inputClass} {...inputProps} />
      {error && <p className="text-xs text-danger-600 mt-0.5">{error}</p>}
    </div>
  );
}
