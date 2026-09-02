import { Navigate, Route, Routes } from 'react-router-dom';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { AdminAuthProvider, useAdminAuth } from './context/admin-auth';
import { AdminLoginPage } from './pages/login';
import { AdminEmpresasPage } from './pages/empresas';

function Gate() {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) return <LoadingSpinner fullScreen label="Carregando…" />;
  if (!isAuthenticated) return <AdminLoginPage />;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-6 sm:px-6">
      <Routes>
        <Route index element={<AdminEmpresasPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div>
  );
}

/** Área isolada do dono da plataforma — auth e roteamento próprios, como o app do cliente em /app. */
export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <Gate />
    </AdminAuthProvider>
  );
}
