import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

/** Campo do app do cliente: rótulo grande sempre visível, input alto e legível. */
export const Field = React.forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, className, id, ...props },
  ref,
) {
  const reactId = React.useId();
  const fieldId = id ?? reactId;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-[13px] font-semibold text-fg">
        {label}
      </label>
      <input
        id={fieldId}
        ref={ref}
        className={cn(
          'h-12 w-full rounded-lg border border-border-strong bg-surface px-3.5 text-[15px] text-fg',
          'placeholder:text-fg-subtle outline-none transition-colors',
          'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
          className,
        )}
        {...props}
      />
      {hint ? <p className="text-[13px] text-fg-subtle">{hint}</p> : null}
    </div>
  );
});

export const PasswordField = React.forwardRef<HTMLInputElement, FieldProps>(function PasswordField(
  { label, hint, className, id, ...props },
  ref,
) {
  const reactId = React.useId();
  const fieldId = id ?? reactId;
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-[13px] font-semibold text-fg">
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn(
            'h-12 w-full rounded-lg border border-border-strong bg-surface pl-3.5 pr-12 text-[15px] text-fg',
            'placeholder:text-fg-subtle outline-none transition-colors',
            'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-fg-subtle"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {hint ? <p className="text-[12px] text-fg-subtle">{hint}</p> : null}
    </div>
  );
});
