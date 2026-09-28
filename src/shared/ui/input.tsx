import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & { error?: boolean };
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean };

export function Input({ className, error, ...props }: InputProps) {
  return <input className={cn('field__control', error && 'field__control--error', className)} {...props} />;
}

export function Textarea({ className, error, ...props }: TextareaProps) {
  return <textarea className={cn('field__control', 'field__textarea', error && 'field__control--error', className)} {...props} />;
}
