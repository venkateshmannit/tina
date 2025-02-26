// src/components/Button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ isLoading, variant = 'primary', children, ...props }) => {
  const baseClass =
    'w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2';
  const primaryClass = 'text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500';
  const secondaryClass = 'text-indigo-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-indigo-500';
  const classes = `${baseClass} ${variant === 'primary' ? primaryClass : secondaryClass}`;

  return (
    <button className={classes} {...props}>
      {isLoading ? 'Loading...' : children}
    </button>
  );
};

export default Button;
