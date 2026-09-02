/**
 * Guarda o resgate em aberto do cliente (só há um por vez, o backend garante).
 * Assim o app consegue voltar pra tela do QR mesmo se ele sair e entrar de novo.
 */
const KEY = 'fidelidade_cliente_resgate_aberto';

export interface PendingResgate {
  resgateId: string;
  token: string;
  recompensaTitulo: string;
  custoPontos: number;
  expiraEm: string;
}

export function getPendingResgate(): PendingResgate | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingResgate) : null;
  } catch {
    return null;
  }
}

export function setPendingResgate(value: PendingResgate | null) {
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
