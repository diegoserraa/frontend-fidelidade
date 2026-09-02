import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { ClienteAuthProvider, useClienteAuth } from './context/cliente-auth';
import { useEmpresaTemaPublico } from './hooks/use-empresa-tema-publico';
import { resetTheme } from './lib/theme';
import { TabBar } from './components/tab-bar';
import { ClienteLoginPage } from './pages/login';
import { CartaoPage } from './pages/cartao';
import { RecompensasPage } from './pages/recompensas';
import { ExtratoPage } from './pages/extrato';
import { PerfilPage } from './pages/perfil';
import { ResgatePage } from './pages/resgate';

function TabbedLayout() {
  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overscroll-y-none bg-canvas">
      <Outlet />
      <TabBar />
    </div>
  );
}

function Gate() {
  const { isAuthenticated, isLoading } = useClienteAuth();

  // Antes de logar não há sessão para `GET /cliente/empresas` — usa o
  // endpoint público para já pintar a tela de login com a marca configurada.
  useEmpresaTemaPublico(!isAuthenticated);

  // Ao sair do app do cliente, devolve a cor padrão para o resto do site.
  useEffect(() => () => resetTheme(), []);

  if (isLoading) return <LoadingSpinner fullScreen label="Carregando…" />;

  if (!isAuthenticated) {
    return (
      <div className="mx-auto min-h-[100dvh] w-full max-w-md bg-canvas">
        <ClienteLoginPage />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="resgate/:id"
        element={
          <div className="mx-auto min-h-[100dvh] w-full max-w-md bg-canvas">
            <ResgatePage />
          </div>
        }
      />
      <Route element={<TabbedLayout />}>
        <Route index element={<CartaoPage />} />
        <Route path="recompensas" element={<RecompensasPage />} />
        <Route path="extrato" element={<ExtratoPage />} />
        <Route path="perfil" element={<PerfilPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}

export default function ClienteApp() {
  return (
    <ClienteAuthProvider>
      <Gate />
    </ClienteAuthProvider>
  );
}
