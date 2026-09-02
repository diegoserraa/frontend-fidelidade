/**
 * Converte qualquer erro (rede, API, exceção JS) numa mensagem curta e
 * compreensível para o usuário final — nunca expõe stack traces ou
 * "TypeError: ...".
 */
export function getErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (error instanceof Error && error.message) {
    const message = error.message.trim();

    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
    }

    // Mensagens vindas da API (lib/api.ts) já são amigáveis e em português.
    const looksTechnical =
      /^[A-Z][a-zA-Z]+Error:/.test(message) ||
      message.includes('undefined') ||
      message.includes('null') ||
      message.length > 160;

    return looksTechnical ? fallback : message;
  }

  if (typeof error === 'string' && error.trim()) return error.trim();

  return fallback;
}
