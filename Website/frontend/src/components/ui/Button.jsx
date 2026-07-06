import React from 'react';

const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  danger: 'bg-red-50 text-red-700 hover:bg-red-100',
};

const sizes = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-4 py-2.5 text-sm',
};

const Button = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    className={`inline-flex items-center justify-center rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
    {...props}
  >
    {children}
  </button>
);

export default Button;
