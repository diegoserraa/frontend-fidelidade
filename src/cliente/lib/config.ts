/**
 * Id da padaria "atual" deste app. Um único deploy atende várias empresas
 * (cadastradas em `/admin`, que vive na mesma origem/deploy que `/app` — ver
 * `buildAppQrUrl` em `src/lib/qr.ts`), então a origem do id é, em ordem de
 * prioridade:
 *
 *  1. `/app/<uuid>/...` — o primeiro pedaço do caminho, do QR impresso no
 *     balcão (Configurações → "QR do balcão") ou do QR que o super admin
 *     gera em `/admin` ao cadastrar uma padaria nova. Cada padaria precisa
 *     de um ENDEREÇO distinto de verdade (não só um parâmetro na mesma URL)
 *     — senão o Android trata duas instalações como o mesmo site e a
 *     segunda escaneada abre dentro do ícone já instalado da primeira, em
 *     vez de virar uma instalação separada na tela inicial.
 *  2. `?empresa=<uuid>` na URL — formato antigo, mantido só por
 *     compatibilidade com QRs já impressos antes dessa mudança pra rota
 *     própria por padaria. Reimprimir o "QR do balcão" já gera no formato
 *     novo.
 *  3. `VITE_EMPRESA_ID` (variável de build) — fallback pra um deploy dedicado
 *     de UMA padaria só (domínio próprio, sem depender de QR nem `/admin`).
 *
 * Qualquer id achado (caminho ou `?empresa=`) é guardado no localStorage pra
 * sobreviver ao cadastro/login e a uma nova visita sem o link.
 *
 * Entrar no programa dessa empresa SEMPRE passa por confirmação explícita do
 * cliente (ver `hooks/use-empresa.ts` / tela em `cartao.tsx`) — nunca
 * acontece só porque a pessoa já estava logada e passou perto do link/QR de
 * uma empresa que não é a dela. Sem nenhum dos três, a tela Cartão mostra
 * "Mostrar meu código" pro atendente vincular no primeiro scan.
 */
export const EMPRESA_ID_STORAGE_KEY = 'fidelidade_cliente_empresa_id';
const STORAGE_KEY = EMPRESA_ID_STORAGE_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveEmpresaId(): { id: string | null; origem: 'path' | 'url' | 'storage' | 'env' | 'nenhuma' } {
  try {
    const segmentos = window.location.pathname.split('/').filter(Boolean);
    const daPath = segmentos[0] === 'app' ? segmentos[1] : undefined;
    if (daPath && UUID_RE.test(daPath)) {
      localStorage.setItem(STORAGE_KEY, daPath);
      return { id: daPath, origem: 'path' };
    }
  } catch {
    /* SSR/URL indisponível — ignora */
  }

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

/**
 * Monta um caminho dentro do app do cliente, já prefixado com a padaria
 * ATUAL quando ela existe — usar em vez de escrever "/app/..." à mão em
 * navegações internas, pra nunca perder o prefixo da padaria ao trocar de
 * tela (isso faria o Android achar que saiu do "site" da padaria instalada).
 */
export function appPath(suffix = ''): string {
  const base = EMPRESA_ID ? `/app/${EMPRESA_ID}` : '/app';
  return suffix ? `${base}/${suffix}` : base;
}

const resolvido = resolveEmpresaId();
export const EMPRESA_ID: string | null = resolvido.id;

if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  const log = console;
  if (resolvido.origem === 'path') {
    log.info(`[app-cliente] empresa=${EMPRESA_ID} veio do caminho da URL (QR) — pede confirmação antes de entrar.`);
  } else if (resolvido.origem === 'url') {
    log.info(`[app-cliente] empresa=${EMPRESA_ID} veio do ?empresa= antigo (QR impresso antes da rota própria) — pede confirmação antes de entrar.`);
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
