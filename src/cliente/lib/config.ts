/**
 * Id da padaria dona deste app. Como o mesmo deploy agora pode atender várias
 * empresas (cadastradas em /admin), a origem do id é, em ordem de prioridade:
 *
 *  1. `?empresa=<uuid>` na URL — como quando o cliente escaneia o QR impresso
 *     no balcão (gerado em Configurações → "QR do balcão", que já embute o
 *     id da empresa dona daquele balcão). Guardado no localStorage assim que
 *     visto, pra sobreviver ao cadastro/login e a uma nova visita sem o link.
 *  2. `VITE_EMPRESA_ID` (arquivo `.env` / `.env.local` — exige reiniciar o
 *     `npm run dev`) — só faz sentido pra quem ainda usa este app como
 *     deploy single-tenant (uma padaria só, sem QR nem /admin).
 *
 * Quando presente, o cliente entra no programa dessa padaria automaticamente
 * ao logar/cadastrar (ver `hooks/use-empresa.ts`). Sem nenhum dos dois, a
 * tela Cartão ainda mostra "Mostrar meu código" pro atendente vincular no
 * primeiro scan.
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
    log.info(`[app-cliente] empresa=${EMPRESA_ID} veio da URL (QR do balcão) — auto-vínculo ativo.`);
  } else if (resolvido.origem === 'storage') {
    log.info(`[app-cliente] empresa=${EMPRESA_ID} lembrado de uma visita anterior — auto-vínculo ativo.`);
  } else if (resolvido.origem === 'env') {
    log.info(`[app-cliente] VITE_EMPRESA_ID OK — auto-vínculo com ${EMPRESA_ID}`);
  } else {
    log.warn(
      '[app-cliente] Nenhuma empresa identificada (sem ?empresa= na URL, nada salvo, sem ' +
        'VITE_EMPRESA_ID). O cliente registra a conta mas NÃO entra em nenhuma padaria — precisa ' +
        'ser vinculado no balcão.',
    );
  }
}
