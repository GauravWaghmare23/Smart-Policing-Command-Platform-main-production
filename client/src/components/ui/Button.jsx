// src/components/ui/Button.jsx
import React from 'react';
import classNames from 'classnames';

/**
 * Reusable button component following the new design system.
 * Variants: primary, secondary, danger, ghost, disabled.
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  onClick,
  ...props
}) {
  const baseClasses = 'btn transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-primary-blue text-white hover:bg-primary-blue/90 focus-visible:ring-primary-blue',
    secondary: 'bg-surface-100 text-surface-700 border border-border hover:bg-surface-200 focus-visible:ring-primary-blue',
    danger: 'bg-danger-color text-white hover:bg-danger-color/90 focus-visible:ring-danger-color',
    ghost: 'bg-transparent text-surface-600 hover:bg-surface-100 focus-visible:ring-primary-blue',
  };
  const sizes = {
    sm: 'text-xs px-3 py-1.5 rounded-lg',
    md: 'text-sm px-4 py-2.5 rounded-xl',
    lg: 'text-base px-5 py-3 rounded-2xl',
  };

  const classes = classNames(
    baseClasses,
    variants[variant] || variants.primary,
    sizes[size] || sizes.md,
    className
  );

  return (
    <button className={classes} disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  );
}
