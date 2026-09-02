import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiRequest, setUnauthorizedHandler, TOKEN_STORAGE_KEY } from '../lib/api';
import type { LoginResponse, Recurso, UsuarioAutenticado } from '../types/api';

interface LoginInput {
  cnpj: string;
  email: string;
  senha: string;
}

interface AuthContextValue {
  user: UsuarioAutenticado | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  /** Gestor sempre retorna true (acesso total implícito). */
  temPermissao: (recurso: Recurso) => boolean;
}

const STORAGE_USER = 'fidelidade_user';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): UsuarioAutenticado | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER);
    return raw ? (JSON.parse(raw) as UsuarioAutenticado) : null;
  } catch {
    return null;
  }
}

function persist(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* storage indisponível — a sessão vale apenas para a aba atual */
  }
}

async function fetchCurrentUser(): Promise<UsuarioAutenticado> {
  const data = await apiRequest<{
    id: string;
    nome: string;
    email: string;
    papel: string;
    empresaId?: string;
    permissoes: Recurso[];
  }>('/auth/me');

  return {
    id: data.id,
    nome: data.nome,
    email: data.email,
    papel: data.papel as UsuarioAutenticado['papel'],
    empresaId: data.empresaId,
    permissoes: data.permissoes,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<UsuarioAutenticado | null>(readStoredUser);
  const [isLoading, setIsLoading] = useState(Boolean(token));

  useEffect(() => persist(TOKEN_STORAGE_KEY, token), [token]);
  useEffect(() => persist(STORAGE_USER, user ? JSON.stringify(user) : null), [user]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsLoading(false);
  }, []);

  // Encerra a sessão automaticamente quando a API responde 401.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Revalida o usuário sempre que houver token (boot da app ou novo login).
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    fetchCurrentUser()
      .then((current) => {
        if (!cancelled) setUser(current);
      })
      .catch(() => {
        if (!cancelled) logout();
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      setUser(await fetchCurrentUser());
    } catch {
      logout();
    }
  }, [token, logout]);

  const login = useCallback(async (input: LoginInput) => {
    const data = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setToken(data.token);
    setUser(data.usuario);
    setIsLoading(false);
  }, []);

  const temPermissao = useCallback(
    (recurso: Recurso) => user?.permissoes.includes(recurso) ?? false,
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      logout,
      refreshUser,
      temPermissao,
    }),
    [user, token, isLoading, login, logout, refreshUser, temPermissao],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
