import { apiBaseUrl, ApiError } from '../../lib/api';

/**
 * Camada HTTP da área do dono da plataforma (/admin) — separada da do painel
 * e da do app do cliente pra não misturar tokens nem o logout automático de
 * cada uma. Token guardado em `fidelidade_admin_token`.
 */

export const ADMIN_TOKEN_KEY = 'fidelidade_admin_token';

export function readAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeAdminToken(token: string | null) {
  try {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* storage indisponível */
  }
}

let onUnauthorized: (() => void) | null = null;
export function setAdminUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = readAdminToken();
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
