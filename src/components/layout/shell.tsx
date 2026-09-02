import { useEffect, useRef, useState } from 'react';
import {
  Coins,
  Gift,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Receipt,
  ScanLine,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import type { Recurso } from '../../types/api';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Sem recurso = sempre visível (Dashboard). */
  recurso?: Recurso;
  /** Só aparece para gestor, independente de `permissoes` (Usuários, Configuração). */
  soGestor?: boolean;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/balcao', label: 'Balcão', icon: ScanLine, recurso: 'balcao' },
  { to: '/clientes', label: 'Clientes', icon: Users, recurso: 'clientes' },
  { to: '/compras', label: 'Compras', icon: Receipt, recurso: 'compras' },
  { to: '/recompensas', label: 'Recompensas', icon: Gift, recurso: 'recompensas' },
  { to: '/programa', label: 'Programa de pontos', icon: Coins, recurso: 'programa' },
  { to: '/promocoes', label: 'Promoções', icon: Megaphone, recurso: 'promocoes' },
  { to: '/usuarios', label: 'Usuários', icon: UserCog, soGestor: true },
  { to: '/configuracoes', label: 'Configuração', icon: Settings, soGestor: true },
];

const papelLabel: Record<string, string> = {
  gestor: 'Gestor',
  atendente: 'Atendente',
};

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-fg-onprimary">
        <ShieldCheck className="size-4" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-fg">Fideliza+</span>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { user, temPermissao } = useAuth();
  const isGestor = user?.papel === 'gestor';
  const visiveis = navItems.filter((item) => {
    if (item.soGestor) return isGestor;
    if (item.recurso) return temPermissao(item.recurso);
    return true;
  });

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Navegação principal">
      {visiveis.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              isActive
                ? 'bg-primary-subtle text-primary-subtle-fg'
                : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                className={cn('size-4 shrink-0', isActive ? 'text-primary' : 'text-fg-subtle')}
                aria-hidden="true"
              />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function AccountPanel() {
  const { user, logout } = useAuth();

  return (
    <div className="border-t border-border pt-3">
      <div className="flex items-center gap-3 px-1">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[13px] font-semibold text-fg-muted">
          {(user?.nome ?? 'U').charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-fg">{user?.nome ?? 'Usuário'}</p>
          <p className="truncate text-xs text-fg-subtle">
            {papelLabel[user?.papel ?? ''] ?? 'Atendente'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={logout}
          aria-label="Sair da conta"
          title="Sair"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Enquanto o drawer está aberto: Esc fecha, o scroll do body trava e o foco
  // vai para dentro do painel; ao fechar, o foco volta para o botão do menu.
  useEffect(() => {
    if (!drawerOpen) return;

    const trigger = menuTriggerRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    drawerRef.current?.querySelector<HTMLElement>('a,button')?.focus();

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      trigger?.focus();
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:h-dvh lg:grid-cols-[224px_1fr] lg:overflow-hidden">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
      >
        Pular para o conteúdo
      </a>

      {/* Sidebar — desktop */}
      <aside className="hidden h-dvh flex-col border-r border-border bg-surface px-3 py-4 lg:flex">
        <div className="px-1">
          <BrandMark />
        </div>
        <div className="mt-5 flex-1 overflow-y-auto">
          <NavList />
        </div>
        <AccountPanel />
      </aside>

      {/* Top bar — mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <BrandMark />
        <Button
          ref={menuTriggerRef}
          variant="outline"
          size="icon"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={drawerOpen}
          aria-controls="mobile-drawer"
        >
          <Menu className="size-4" />
        </Button>
      </header>

      {/* Drawer — mobile */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-fg/40 motion-safe:animate-[fade-in_120ms_ease-out]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            id="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            className="absolute inset-y-0 left-0 flex w-[80%] max-w-xs flex-col border-r border-border bg-surface px-4 py-5 shadow-lg motion-safe:animate-[drawer-in_160ms_ease-out]"
          >
            <div className="flex items-center justify-between">
              <BrandMark />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fechar menu"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="mt-6 flex-1 overflow-y-auto">
              <NavList onNavigate={() => setDrawerOpen(false)} />
            </div>
            <AccountPanel />
          </div>
        </div>
      ) : null}

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-col lg:h-dvh">
        <main
          id="conteudo"
          className="flex-1 px-4 py-5 sm:px-5 lg:overflow-y-auto lg:px-4 lg:py-4"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
