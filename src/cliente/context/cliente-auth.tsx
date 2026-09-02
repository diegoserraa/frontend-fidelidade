import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  readClienteToken,
  setClienteUnauthorizedHandler,
  writeClienteToken,
} from '../lib/cliente-api';
import { portalApi } from '../services/portal';
import type { ClienteConta } from '../../types/api';

interface ClienteAuthValue {
  cliente: ClienteConta | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  entrar: (input: { cpf: string; senha: string }) => Promise<void>;
  criarConta: (input: {
    nome: string;
    cpf: string;
    senha: string;
    telefone?: string;
  }) => Promise<void>;
  sair: () => void;
  atualizar: () => Promise<void>;
}

const STORAGE_CLIENTE = 'fidelidade_cliente';
const ClienteAuthContext = createContext<ClienteAuthValue | undefined>(undefined);

function readStored(): ClienteConta | null {
  try {
    const raw = localStorage.getItem(STORAGE_CLIENTE);
    return raw ? (JSON.parse(raw) as ClienteConta) : null;
  } catch {
    return null;
  }
}

function persist(cliente: ClienteConta | null) {
  try {
    if (cliente) localStorage.setItem(STORAGE_CLIENTE, JSON.stringify(cliente));
    else localStorage.removeItem(STORAGE_CLIENTE);
  } catch {
    /* ignore */
  }
}

export function ClienteAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readClienteToken());
  const [cliente, setCliente] = useState<ClienteConta | null>(readStored);
  const [isLoading, setIsLoading] = useState(Boolean(token));

  const sair = useCallback(() => {
    writeClienteToken(null);
    persist(null);
    setToken(null);
    setCliente(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setClienteUnauthorizedHandler(sair);
    return () => setClienteUnauthorizedHandler(null);
  }, [sair]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    portalApi
      .me()
      .then((c) => {
        if (!cancelled) {
          setCliente(c);
          persist(c);
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

  const entrar = useCallback(async (input: { cpf: string; senha: string }) => {
    const data = await portalApi.login(input);
    writeClienteToken(data.token);
    persist(data.cliente);
    setToken(data.token);
    setCliente(data.cliente);
    setIsLoading(false);
  }, []);

  const criarConta = useCallback(
    async (input: { nome: string; cpf: string; senha: string; telefone?: string }) => {
      const data = await portalApi.registrar(input);
      writeClienteToken(data.token);
      persist(data.cliente);
      setToken(data.token);
      setCliente(data.cliente);
      setIsLoading(false);
    },
    [],
  );

  const atualizar = useCallback(async () => {
    try {
      const c = await portalApi.me();
      setCliente(c);
      persist(c);
    } catch {
      sair();
    }
  }, [sair]);

  const value = useMemo<ClienteAuthValue>(
    () => ({
      cliente,
      token,
      isAuthenticated: Boolean(token && cliente),
      isLoading,
      entrar,
      criarConta,
      sair,
      atualizar,
    }),
    [cliente, token, isLoading, entrar, criarConta, sair, atualizar],
  );

  return <ClienteAuthContext.Provider value={value}>{children}</ClienteAuthContext.Provider>;
}

// oxlint-disable-next-line react/only-export-components
export function useClienteAuth() {
  const ctx = useContext(ClienteAuthContext);
  if (!ctx) throw new Error('useClienteAuth deve ser usado dentro de ClienteAuthProvider');
  return ctx;
}
