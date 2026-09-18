/**
 * Id da padaria "atual" deste app. Um único deploy atende várias empresas
 * (cadastradas em `/admin`, que vive na mesma origem/deploy que `/app` — ver
 * `buildAppQrUrl` em `src/lib/qr.ts`), então a origem do id é, em ordem de
 * prioridade:
 *
 *  1. `?empresa=<uuid>` na URL — do QR impresso no balcão (Configurações →
 *     "QR do balcão", que já embute o id da empresa dona daquele balcão), ou
 *     do QR que o super admin gera em `/admin` ao cadastrar uma padaria nova.
 *     Guardado no localStorage assim que visto, pra sobreviver ao
 *     cadastro/login e a uma nova visita sem o link.
 *  2. `VITE_EMPRESA_ID` (variável de build) — fallback pra um deploy dedicado
 *     de UMA padaria só (domínio próprio, sem depender de QR nem `/admin`).
 *
 * Entrar no programa dessa empresa SEMPRE passa por confirmação explícita do
 * cliente (ver `hooks/use-empresa.ts` / tela em `cartao.tsx`) — nunca
 * acontece só porque a pessoa já estava logada e passou perto do link/QR de
 * uma empresa que não é a dela. Sem nenhum dos dois, a tela Cartão mostra
 * "Mostrar meu código" pro atendente vincular no primeiro scan.
 */
const STORAGE_KEY = 'fidelidade_cliente_empresa_id';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveEmpresaId(): { id: string | null; origem: 'url' | 'storage' | 'env' | 'nenhuma' } {
  try {
    const daUrl = new URLSearchParams(window.location.search).get('empresa');
    if (daUrl && UUID_RE.test(daUrl)) {
      localStorage.setItem(STORAGE_KEY, daUrl);
      return { id: daUrl, origem: 'url' };
    }
  } catch {
    /* URL/localStorage indisponíveis (SSR, storage bloqueado) — ignora */
  }

  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado && UUID_RE.test(guardado)) return { id: guardado, origem: 'storage' };
  } catch {
    /* ignore */
  }

  const doEnv = (import.meta.env.VITE_EMPRESA_ID ?? '').trim();
  if (UUID_RE.test(doEnv)) return { id: doEnv, origem: 'env' };

  return { id: null, origem: 'nenhuma' };
}

const resolvido = resolveEmpresaId();
export const EMPRESA_ID: string | null = resolvido.id;

if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  const log = console;
  if (resolvido.origem === 'url') {
    log.info(`[app-cliente] empresa=${EMPRESA_ID} veio da URL (QR) — pede confirmação antes de entrar.`);
  } else if (resolvido.origem === 'storage') {
    log.info(`[app-cliente] empresa=${EMPRESA_ID} lembrado de uma visita anterior.`);
  } else if (resolvido.origem === 'env') {
    log.info(`[app-cliente] VITE_EMPRESA_ID OK — ${EMPRESA_ID}`);
  } else {
    log.warn(
      '[app-cliente] Nenhuma empresa identificada (sem ?empresa= na URL, nada salvo, sem ' +
        'VITE_EMPRESA_ID). O cliente registra a conta mas NÃO entra em nenhuma padaria — precisa ' +
        'ser vinculado no balcão.',
    );
  }
}
