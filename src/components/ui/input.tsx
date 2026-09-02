import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  hint?: string;
  label?: string;
  /** Elemento fixo à esquerda do campo (ex.: "R$"). */
  leftSlot?: React.ReactNode;
  /** Elemento fixo à direita do campo (ex.: botão de mostrar senha). */
  rightSlot?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, hint, label, id, leftSlot, rightSlot, ...props }, ref) => {
    const reactId = React.useId();
    const fieldId = id ?? reactId;
    const hintId = hint ? `${fieldId}-hint` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={fieldId} className="text-[13px] font-medium text-fg">
            {label}
          </label>
        )}
        <div className="relative">
          {leftSlot ? (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-fg-subtle">
              {leftSlot}
            </div>
          ) : null}
          <input
            id={fieldId}
            type={type}
            ref={ref}
            aria-invalid={error || undefined}
            aria-describedby={hintId}
            className={cn(
              'h-9 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-fg',
              'placeholder:text-fg-subtle transition-colors',
              'focus-visible:border-primary',
              'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60',
              error && 'border-danger focus-visible:border-danger',
              type === 'color' && 'h-9 w-14 cursor-pointer p-1',
              leftSlot && 'pl-9',
              rightSlot && 'pr-10',
              className,
            )}
            {...props}
          />
          {rightSlot ? (
            <div className="absolute inset-y-0 right-0 flex items-center pr-1">{rightSlot}</div>
          ) : null}
        </div>
        {hint && (
          <p id={hintId} className={cn('text-xs', error ? 'text-danger-fg' : 'text-fg-subtle')}>
            {hint}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
