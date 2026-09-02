export type ApiErrorPayload = {
  /** Chave que a API sempre usa (ver error.middleware.ts) — checada primeiro. */
  erro?: string;
  message?: string;
  error?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const DEFAULT_API_URL = 'http://localhost:3000/api';

export const apiBaseUrl = (import.meta.env.VITE_API_URL ?? DEFAULT_API_URL).replace(/\/$/, '');

export const TOKEN_STORAGE_KEY = 'fidelidade_token';

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Callback disparado quando a API responde 401 — permite que o AuthProvider
 * limpe a sessão sem acoplar a camada HTTP ao React.
 */
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = readToken();
  const headers = new Headers(init.headers);

  headers.set('Accept', 'application/json');
  if (init.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  } catch {
    throw new ApiError('Sem conexão com o servidor. Verifique sua internet e tente novamente.', 0);
  }

  if (response.status === 401) {
    unauthorizedHandler?.();
    throw new ApiError('Sua sessão expirou. Entre novamente para continuar.', 401);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => ({}))) as unknown;

  if (!response.ok) {
    const data = payload as ApiErrorPayload;
    throw new ApiError(
      data?.erro || data?.message || data?.error || 'Não foi possível completar a operação.',
      response.status,
    );
  }

  return payload as T;
}
