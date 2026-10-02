// src/components/ui/Card.jsx
import React from 'react';
import classNames from 'classnames';

/**
 * Card component following the new design system.
 * Props:
 *   children – content inside the card
 *   className – additional Tailwind classes
 *   variant – future extension (e.g., "danger", "primary") – currently unused
 */
export default function Card({ children, className = '', variant = '', ...props }) {
  const base = 'bg-white rounded-2xl shadow-card border border-border';
  // Future variant handling could extend background/border colors.
  const classes = classNames(base, className);
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
