import React from 'react';

const variants = {
  primary: 'bg-blue-50 text-blue-700',
  warning: 'bg-amber-50 text-amber-700',
  info: 'bg-sky-50 text-sky-700',
  success: 'bg-emerald-50 text-emerald-700',
};

const Badge = ({ children, variant = 'primary' }) => (
  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${variants[variant] || variants.primary}`}>
    {children}
  </span>
);

export default Badge;
