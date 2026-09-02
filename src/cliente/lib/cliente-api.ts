import { apiBaseUrl, ApiError } from '../../lib/api';

/**
 * Camada HTTP do app do cliente — separada da do painel para não misturar
 * tokens nem o logout automático. Token guardado em `fidelidade_cliente_token`.
 */

export const CLIENTE_TOKEN_KEY = 'fidelidade_cliente_token';

export function readClienteToken(): string | null {
  try {
    return localStorage.getItem(CLIENTE_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeClienteToken(token: string | null) {
  try {
    if (token) localStorage.setItem(CLIENTE_TOKEN_KEY, token);
    else localStorage.removeItem(CLIENTE_TOKEN_KEY);
  } catch {
    /* storage indisponível */
  }
}

let onUnauthorized: (() => void) | null = null;
export function setClienteUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export async function clienteRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = readClienteToken();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  } catch {
    throw new ApiError('Sem conexão. Verifique sua internet e tente de novo.', 0);
  }

  if (response.status === 401) {
    onUnauthorized?.();
    throw new ApiError('Sua sessão expirou. Entre novamente.', 401);
  }
  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) {
    const data = payload as { message?: string; error?: string; erro?: string };
    throw new ApiError(
      data?.erro || data?.message || data?.error || 'Não foi possível completar a operação.',
      response.status,
    );
  }
  return payload as T;
}
