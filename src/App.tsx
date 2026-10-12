import { lazy, Suspense, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/auth-context';
import { ErrorBoundary } from './components/app/error-boundary';
import { RequireGestor, RequirePermission } from './components/app/require-permission';
import { ToastProvider } from './components/ui/toast';
import { LoadingSpinner } from './components/ui/loading-spinner';
import { AppShell } from './components/layout/shell';
import { useBrandThemeInit } from './hooks/use-theme';

const ClienteApp = lazy(() => import('./cliente/ClienteApp'));
const AdminApp = lazy(() => import('./admin/AdminApp'));
const RedefinirSenhaPage = lazy(() =>
  import('./cliente/pages/redefinir-senha').then((m) => ({ default: m.RedefinirSenhaPage })),
);
const PrivacidadePage = lazy(() =>
  import('./cliente/pages/privacidade').then((m) => ({ default: m.PrivacidadePage })),
);
const ClienteAuthProviderLazy = lazy(() =>
  import('./cliente/context/cliente-auth').then((m) => ({ default: m.ClienteAuthProvider })),
);
const LoginPage = lazy(() => import('./pages/login').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() =>
  import('./pages/dashboard').then((m) => ({ default: m.DashboardPage })),
);
const ClientesPage = lazy(() =>
  import('./pages/clientes').then((m) => ({ default: m.ClientesPage })),
);
const BalcaoPage = lazy(() => import('./pages/balcao').then((m) => ({ default: m.BalcaoPage })));
const ComprasPage = lazy(() => import('./pages/compras').then((m) => ({ default: m.ComprasPage })));
const RecompensasPage = lazy(() =>
  import('./pages/recompensas').then((m) => ({ default: m.RecompensasPage })),
);
const PromocoesPage = lazy(() =>
  import('./pages/promocoes').then((m) => ({ default: m.PromocoesPage })),
);
const UsuariosPage = lazy(() =>
  import('./pages/usuarios').then((m) => ({ default: m.UsuariosPage })),
);
const ConfiguracoesPage = lazy(() =>
  import('./pages/configuracoes').then((m) => ({ default: m.ConfiguracoesPage })),
);
const ProgramaPage = lazy(() =>
  import('./pages/programa').then((m) => ({ default: m.ProgramaPage })),
);

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : null;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen label="Carregando seu painel…" />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* App do cliente (PWA) — auth e shell próprios, isolado do painel.
            Rota própria por padaria (/app/:empresaId/...) além da genérica
            (/app/..., usada pelo deploy single-tenant de VITE_EMPRESA_ID):
            cada padaria precisa de um endereço distinto de verdade — não só
            um ?empresa= na mesma URL — senão o Android trata as instalações
            como o mesmo site e passa a abrir a segunda padaria escaneada
            dentro do ícone já instalado da primeira, em vez de oferecer uma
            instalação separada. */}
        {/* Rotas explícitas ANTES das genéricas abaixo: sem isso, o React
            Router prefere "/app/:empresaId/*" pra URLs tipo
            "/app/redefinir-senha" (interpreta "redefinir-senha" como se
            fosse um empresaId, por ter um segmento a mais que "/app/*" antes
            do catch-all) e cai direto na tela de login — quem clica no link
            de redefinição de senha do e-mail (que SEMPRE usa a forma sem
            empresaId, ver clienteAuth.service.ts) nunca via a tela certa.
            Só cobre a forma "pelada" (sem empresaId): com empresaId prefixado
            (ex.: instalado numa padaria específica), o /app/:empresaId/*
            de baixo já resolve certo, porque aí o "sobra" bate com a rota
            interna em ClienteApp.tsx. */}
        <Route
          path="/app/redefinir-senha"
          element={
            <ClienteAuthProviderLazy>
              <RedefinirSenhaPage />
            </ClienteAuthProviderLazy>
          }
        />
        <Route path="/app/privacidade" element={<PrivacidadePage />} />
        <Route path="/app/*" element={<ClienteApp />} />
        <Route path="/app/:empresaId/*" element={<ClienteApp />} />
        {/* Área do dono da plataforma (cadastro de empresas) — auth própria */}
        <Route path="/admin/*" element={<AdminApp />} />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route
            path="balcao"
            element={
              <RequirePermission recurso="balcao">
                <BalcaoPage />
              </RequirePermission>
            }
          />
          <Route
            path="clientes"
            element={
              <RequirePermission recurso="clientes">
                <ClientesPage />
              </RequirePermission>
            }
          />
          <Route
            path="compras"
            element={
              <RequirePermission recurso="compras">
                <ComprasPage />
              </RequirePermission>
            }
          />
          <Route
            path="recompensas"
            element={
              <RequirePermission recurso="recompensas">
                <RecompensasPage />
              </RequirePermission>
            }
          />
          <Route
            path="programa"
            element={
              <RequirePermission recurso="programa">
                <ProgramaPage />
              </RequirePermission>
            }
          />
          <Route
            path="promocoes"
            element={
              <RequirePermission recurso="promocoes">
                <PromocoesPage />
              </RequirePermission>
            }
          />
          <Route
            path="usuarios"
            element={
              <RequireGestor>
                <UsuariosPage />
              </RequireGestor>
            }
          />
          <Route
            path="configuracoes"
            element={
              <RequireGestor>
                <ConfiguracoesPage />
              </RequireGestor>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
      </Routes>
    </Suspense>
  );
}

function BrandThemeInit() {
  useBrandThemeInit();
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <BrandThemeInit />
              <AppRoutes />
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
        {ReactQueryDevtools ? (
          <Suspense fallback={null}>
            <ReactQueryDevtools initialIsOpen={false} />
          </Suspense>
        ) : null}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
