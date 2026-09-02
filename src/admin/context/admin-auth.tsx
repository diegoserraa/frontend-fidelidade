import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { readAdminToken, setAdminUnauthorizedHandler, writeAdminToken } from '../lib/admin-api';
import { adminApi } from '../services/admin';
import type { AdminAutenticado } from '../types';

interface AdminAuthValue {
  admin: AdminAutenticado | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: { email: string; senha: string }) => Promise<void>;
  sair: () => void;
}

const STORAGE_ADMIN = 'fidelidade_admin';
const AdminAuthContext = createContext<AdminAuthValue | undefined>(undefined);

function readStored(): AdminAutenticado | null {
  try {
    const raw = localStorage.getItem(STORAGE_ADMIN);
    return raw ? (JSON.parse(raw) as AdminAutenticado) : null;
  } catch {
    return null;
  }
}

function persist(admin: AdminAutenticado | null) {
  try {
    if (admin) localStorage.setItem(STORAGE_ADMIN, JSON.stringify(admin));
    else localStorage.removeItem(STORAGE_ADMIN);
  } catch {
    /* ignore */
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readAdminToken());
  const [admin, setAdmin] = useState<AdminAutenticado | null>(readStored);
  const [isLoading, setIsLoading] = useState(Boolean(token));

  const sair = useCallback(() => {
    writeAdminToken(null);
    persist(null);
    setToken(null);
    setAdmin(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setAdminUnauthorizedHandler(sair);
    return () => setAdminUnauthorizedHandler(null);
  }, [sair]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    adminApi
      .me()
      .then((current) => {
        if (!cancelled) {
          setAdmin(current);
          persist(current);
        }
      })
      .catch(() => {
        if (!cancelled) sair();
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, sair]);

  const login = useCallback(async (input: { email: string; senha: string }) => {
    const data = await adminApi.login(input);
    writeAdminToken(data.token);
    persist(data.admin);
    setToken(data.token);
    setAdmin(data.admin);
    setIsLoading(false);
  }, []);

  const value = useMemo<AdminAuthValue>(
    () => ({
      admin,
      isAuthenticated: Boolean(token && admin),
      isLoading,
      login,
      sair,
    }),
    [admin, token, isLoading, login, sair],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

// oxlint-disable-next-line react/only-export-components
export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth deve ser usado dentro de AdminAuthProvider');
  return ctx;
}
