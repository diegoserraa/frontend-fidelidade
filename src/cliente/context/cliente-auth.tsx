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
import { useToast } from '../../components/ui/toast';
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
    email?: string;
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
  const toast = useToast();
  const [token, setToken] = useState<string | null>(() => readClienteToken());
  const [cliente, setCliente] = useState<ClienteConta | null>(readStored);
  const [isLoading, setIsLoading] = useState(Boolean(token));

  // Limpeza local pura — usada tanto pro logout ativo quanto por um 401
  // (token inválido/sessão encerrada em outro aparelho). `motivo`, quando
  // vem, mostra pro cliente por que ele voltou pra tela de login sozinho.
  const limparSessao = useCallback(
    (motivo?: string) => {
      writeClienteToken(null);
      persist(null);
      setToken(null);
      setCliente(null);
      setIsLoading(false);
      if (motivo) toast.info('Sessão encerrada', motivo);
    },
    [toast],
  );

  useEffect(() => {
    setClienteUnauthorizedHandler(limparSessao);
    return () => setClienteUnauthorizedHandler(null);
  }, [limparSessao]);

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
        if (!cancelled) limparSessao();
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, limparSessao]);

  const entrar = useCallback(async (input: { cpf: string; senha: string }) => {
    const data = await portalApi.login(input);
    writeClienteToken(data.token);
    persist(data.cliente);
    setToken(data.token);
    setCliente(data.cliente);
    setIsLoading(false);
  }, []);

  const criarConta = useCallback(
    async (input: { nome: string; cpf: string; senha: string; telefone?: string; email?: string }) => {
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
      limparSessao();
    }
  }, [limparSessao]);

  // Ação explícita (botão "Sair da conta"): também invalida no servidor, não
  // só localmente — sem isso, um token esquecido logado em outro aparelho
  // continuaria valendo até expirar (até 8h) mesmo depois deste logout.
  const sair = useCallback(() => {
    portalApi.sair().catch(() => undefined);
    limparSessao();
  }, [limparSessao]);

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
