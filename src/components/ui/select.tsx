import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  options: SelectOption[];
  disabled?: boolean;
  error?: boolean;
  className?: string;
  id?: string;
  label?: string;
  'aria-label'?: string;
}

export function Select({
  value,
  onValueChange,
  placeholder = 'Selecione…',
  options,
  disabled = false,
  error = false,
  className,
  id,
  label,
  'aria-label': ariaLabel,
}: SelectProps) {
  const reactId = React.useId();
  const fieldId = id ?? reactId;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={fieldId} className="text-[13px] font-medium text-fg">
          {label}
        </label>
      ) : null}

      <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          id={fieldId}
          aria-label={ariaLabel}
          aria-invalid={error || undefined}
          className={cn(
            'group flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm text-fg',
            'transition-colors outline-none focus-visible:border-primary data-[state=open]:border-primary',
            'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60',
            'data-[placeholder]:text-fg-subtle [&>span]:truncate',
            error && 'border-danger focus-visible:border-danger',
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="size-4 shrink-0 text-fg-subtle transition-transform group-data-[state=open]:rotate-180" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            className={cn(
              'z-50 max-h-64 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-surface p-1 text-fg shadow-lg',
              'motion-safe:data-[state=open]:animate-[fade-in_120ms_ease-out]',
            )}
          >
            <SelectPrimitive.Viewport>
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-2.5 text-[13px] text-fg-muted outline-none',
                    'data-[highlighted]:bg-surface-muted data-[highlighted]:text-fg',
                    'data-[state=checked]:font-medium data-[state=checked]:text-fg',
                  )}
                >
                  <span className="absolute left-2 flex size-4 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="size-4 text-primary" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}
