import { CreditCard, Gift, Receipt, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';

const tabs: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/app', label: 'Cartão', icon: CreditCard, end: true },
  { to: '/app/recompensas', label: 'Prêmios', icon: Gift },
  { to: '/app/extrato', label: 'Extrato', icon: Receipt },
  { to: '/app/perfil', label: 'Perfil', icon: User },
];

export function TabBar() {
  return (
    <nav
      aria-label="Navegação"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-border bg-surface/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-4">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold transition-colors',
                  isActive ? 'text-primary' : 'text-fg-subtle',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full transition-colors',
                      isActive && 'bg-primary-subtle',
                    )}
                  >
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
