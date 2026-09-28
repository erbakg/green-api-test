import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

import { cn } from '@/shared/lib/cn';

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm' | 'icon';
};

export function Button({ className, variant = 'primary', size = 'md', children, ...props }: ButtonProps) {
  return (
    <button className={cn('button', `button--${variant}`, `button--${size}`, className)} {...props}>
      {children}
    </button>
  );
}
