import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium leading-5',
  {
    variants: {
      variant: {
        default: 'border-primary-border bg-primary-subtle text-primary-subtle-fg',
        neutral: 'border-border bg-surface-muted text-fg-muted',
        success: 'border-transparent bg-success-subtle text-success-fg',
        warning: 'border-transparent bg-warning-subtle text-warning-fg',
        danger: 'border-transparent bg-danger-subtle text-danger-fg',
        info: 'border-transparent bg-info-subtle text-info-fg',
        outline: 'border-border-strong bg-transparent text-fg-muted',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

/** Aliases mantidos para compatibilidade com chamadas existentes. */
type LegacyVariant = 'secondary' | 'muted' | 'destructive';
const legacyMap: Record<LegacyVariant, VariantProps<typeof badgeVariants>['variant']> = {
  secondary: 'neutral',
  muted: 'neutral',
  destructive: 'danger',
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    Omit<VariantProps<typeof badgeVariants>, 'variant'> {
  variant?: NonNullable<VariantProps<typeof badgeVariants>['variant']> | LegacyVariant;
  icon?: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', icon, children, ...props }, ref) => {
    const resolved =
      variant in legacyMap ? legacyMap[variant as LegacyVariant] : (variant as VariantProps<typeof badgeVariants>['variant']);

    return (
      <span ref={ref} className={cn(badgeVariants({ variant: resolved }), className)} {...props}>
        {icon}
        {children}
      </span>
    );
  },
);
Badge.displayName = 'Badge';

export { Badge };
