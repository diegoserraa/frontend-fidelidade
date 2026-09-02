# Arquitetura do frontend

## Visão geral

Painel SaaS para gestão de um programa de fidelidade. O frontend consome uma
API REST existente e **não inventa campos, filtros ou endpoints** — o contrato
real está em `src/services/fidelidade.ts` + `src/types/api.ts`.

Stack: React 19 · Vite · TypeScript · Tailwind CSS v4 · React Router · TanStack
Query · Recharts · lucide-react.

## Camadas

| Camada | Local | Responsabilidade |
| --- | --- | --- |
| HTTP base | `src/lib/api.ts` | `fetch` + token, tratamento de erro e de 401 |
| Serviço de domínio | `src/services/fidelidade.ts` | 1 função por endpoint, sem lógica de UI |
| Tipos da API | `src/types/api.ts` | modelos compartilhados |
| Estado de servidor | TanStack Query (`useQuery`/`useMutation`) | cache, loading, erro, revalidação |
| Estado de sessão | `src/context/auth-context.tsx` | token, usuário, login/logout |
| Tema da marca | `src/hooks/use-theme.ts` | aplica `--brand` (cor primária) em runtime |

## Design system

Definido em `src/index.css` via `@theme` do Tailwind v4:

- **Superfícies**: `canvas` (fundo), `surface` (branco), `surface-muted`.
- **Texto**: `fg`, `fg-muted`, `fg-subtle`.
- **Primária**: `--brand` (esmeralda por padrão). Todas as variações
  (`primary-hover`, `primary-subtle`, …) derivam dela por `color-mix`, então
  trocar a cor da empresa em Configuração re-colore a interface inteira sem reload.
- **Semânticas**: `success`, `warning`, `danger`, `info` (+ variação `-subtle`).
- **Raio**: controles `rounded-md`, cartões `rounded-xl`.
- **Sombras**: `shadow-xs`/`shadow-sm` — sutis, sem sombras coloridas.

Primitivos em `src/components/ui/` (Button, Input, SearchInput, Select /
DropdownMenu / Avatar sobre Radix, Dialog com focus-trap, Badge, Card,
Pagination, Segmented, Skeleton, LoadingSpinner, Toast). Blocos compostos em
`src/components/shared/` (PageHeader, DataTable, StatCard, ChartPanel, FormModal,
EmptyState, ErrorState).

O `Select` usa `@radix-ui/react-select` (portal — não é recortado dentro de cards
com `overflow-hidden`), mantendo a API por `options: {value,label}[]`.
`DataTable` tem um slot `toolbar` (busca/filtros) que fica no topo do card, acima
do cabeçalho fixo, para o bloco de listagem ser um módulo coeso.

### shadcn/ui

O projeto está configurado para o shadcn/ui (`components.json`, estilo
`new-york`, Tailwind v4 + CSS variables, alias `@/components/ui`). Os componentes
gerados são **customizados para os tokens deste design system** (`--color-fg`,
`--color-surface`, `--brand`, …) em vez dos nomes padrão do shadcn. Para
adicionar novos: `npx shadcn@latest add <componente>` e trocar as classes de cor
pelas equivalentes (ex.: `bg-popover` → `bg-surface`, `text-muted-foreground` →
`text-fg-subtle`).

### StatCard premium

`StatCard` aceita `accent` (`emerald | sky | violet | amber | rose | teal`): ativa
gradiente claro, brilho no canto (`blur`), contorno e chip do ícone tonalizados,
e sombra colorida sutil. Sem `accent` mantém o visual neutro/clean.

## Padrão de tela de listagem — referência: `pages/clientes.tsx`

Aplicado em **clientes, compras, recompensas, promoções e usuários**. Diferenças
por domínio: compras usa um `Select` de ordenação (não há status); usuários tem
dois `Select` (papel + status); ações de linha variam conforme as mutações
disponíveis (toggle de status, enviar, ou só "copiar").

`configuracoes` é o **editor de marca do app do cliente**, em **uma tela sem
scroll** (`lg:h-full lg:overflow-hidden`): editor compacto (um `Card` com seções
Logo / Cores / Exibição) + mockup de celular (`PhoneFrame`/`AppScreen`) que
**escala pela altura** e mostra 3 telas ao vivo (Cartão / Recompensas / Entrada).
Cores (primária, secundária, **texto sobre a primária**, **fundo das telas**) e
logo alimentam o mockup em tempo real; o nome do negócio vem de `getEmpresa()`.
As 3 telas de prévia são **Cartão / Recompensas / Login** (esta com formulário
real). `lib/color.ts` (`contrastRatio`, `readableTextColor`): o botão "Auto" da
cor de texto escolhe a melhor e um aviso mostra a razão; o texto solto sobre o
fundo se adapta automaticamente a fundos claros ou escuros. Payload:
`cor_primaria`, `cor_secundaria`, `cor_texto`, `cor_fundo`, `logo_url`,
`exibir_total_gasto` (`cor_texto` e `cor_fundo` novos em `EmpresaConfig` — exigem
suporte no backend). Estado do formulário compara campo a campo (`sameForm`) e
re-sincroniza com a resposta do save (`formFromConfig(updated)` +
`setQueryData`). Feedback via `useToast()`; indicadores "Salvo / Não salvo" e
"Restaurar padrão".

Componentes compartilhados desse padrão: `shared/list-card.tsx` (card do modo
mobile, idêntico em todas), `shared/status-badge.tsx` (badge com bolinha),
`DataTable` (`fill` + `toolbar` + `renderCard` + `footer`).

Esta é a estrutura que toda tela de listagem/CRUD deve seguir:

```
<div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
  <PageHeader title description actions={<Button>Novo …</Button>} />
  <div className="grid shrink-0 grid-cols-2 sm:grid-cols-3">  → StatCard size="sm" …
  <div className="flex shrink-0 …">  → <SearchInput/> + <Select/> filtro + contagem
  <DataTable fill footer={<Pagination/>} … />
  <FormModal … />
</div>
```

- **`DataTable fill`**: o card **encolhe para o conteúdo** — com poucas linhas a
  `Pagination` fica logo abaixo da última linha, sem espaço em branco. Quando as
  linhas passariam da viewport, o card para de crescer, as linhas rolam
  internamente com **cabeçalho fixo** e o rodapé (`footer`) fica ancorado. Em
  telas pequenas degrada para fluxo natural (a página rola).
- **`DataTable renderCard`**: abaixo de `md` cada registro vira um card estilizado
  (a tabela some); `md+` mostra a tabela. `toolbar` e `footer` (paginação)
  valem para os dois modos.
- **Estados** (sempre todos): `isLoading` → skeleton de linhas; vazio →
  `EmptyState` com CTA; erro → `ErrorState` com "tentar novamente"; `keepPreviousData`
  mantém as linhas visíveis (esmaecidas) durante a troca de página.
- **Feedback de ação** via `useToast()`: `toast.success/error(titulo, descrição?)`
  após criar, alterar status, excluir, etc. Erros de validação do formulário
  continuam inline no `FormModal` (`error` prop); o toast cobre o resultado final.
- **Larguras**: nada de `max-width` — usa a tela toda; faixa de métricas com
  `StatCard size="sm"`.
- **Filtros na `toolbar`**: busca com `flex-1` (preenche a linha, sem vão),
  status como `Segmented`, botão "Limpar" quando há filtro ativo.
- **Máscaras**: `src/lib/masks.ts` (`maskPhoneBR`, `maskDateBR`, `maskCPF`,
  `maskCNPJ`, `maskCurrencyBRL` + `parseCurrencyBRL`, `isValidCPF`, `brDateToISO`,
  `onlyDigits`). Aplicadas no `onChange`; o payload vai **sem máscara** (telefone e
  CPF só dígitos, data em ISO `aaaa-mm-dd`, valor como `number`). `Input` tem
  `leftSlot`/`rightSlot` para adornos (ex.: `R$`).

> `createCliente` cadastra pelo balcão com `{ nome, cpf, telefone? }` — o cliente é
> PF, identificado por CPF (`POST /clientes`). A senha do app é criada depois pelo
> próprio cliente.

## Balcão (`pages/balcao.tsx`)

Tela operacional do dia a dia (`/balcao`, primeiro item de nav depois do
Dashboard). `Segmented` "Pontuar | Resgatar" e um cartão central único
(`max-w-md`), sem scroll de página em `lg+`.

- **`components/shared/qr-scanner.tsx`** encapsula `html5-qrcode`: liga/desliga a
  câmera pelo prop `active`, moldura com cantos na cor da marca, estados
  "sem permissão"/"sem câmera" e um fallback "colar código" (aceita o token do QR
  ou um CPF digitado — `entrada()` decide qual).
- **Pontuar**: `POST /clientes/identificar` (token de identidade **ou** CPF) →
  cartão do cliente (saldo, selo "novo cliente" quando `novoVinculo`) → valor
  (`maskCurrencyBRL`) → `POST /compras` com header `Idempotency-Key`
  (`crypto.randomUUID()`, evita cobrança dupla no toque duplo) → painel de
  sucesso com `+N pts`.
- **Resgatar**: `POST /resgates/validar` (token do QR de resgate) → confere
  cliente / recompensa / custo / saldo + contador de expiração → **Confirmar
  baixa** (`POST /resgates/:id/confirmar`, único ponto onde os pontos são
  debitados) ou **Recusar** (`POST /resgates/:id/recusar`).
- Invalida `['clientes']`, `['compras']`, `['resgates']`, `['dashboard']` após
  cada operação. A faixa de `StatCard` reusa o cache de `['dashboard']`.
- O QR do cliente é um **token JWT curto** (~90 s) emitido por `POST /cliente/qr`
  no portal do cliente; o de resgate vale ~5 min. Ambos são de uso único na
  prática porque o backend valida status/validade sob lock.

## App do cliente (PWA) — `src/cliente/`

Mora **no mesmo projeto**, isolado sob a rota `/app/*` (lazy em `App.tsx` →
`cliente/ClienteApp.tsx`), com bundle próprio (~16 KB gzip, sem Recharts/Radix
Select). É o **PWA instalável** — o manifesto (`vite.config.ts`) tem
`start_url: '/app/'` e `id: '/app/'`; o painel segue como site normal em `/`.

- **Sessão própria**: `cliente/context/cliente-auth.tsx` + `cliente/lib/cliente-api.ts`
  (token em `fidelidade_cliente_token`, 401 → volta pro login do app). Não
  compartilha nada com o `AuthProvider` do painel.
- **Uma padaria + auto‑vínculo**: `lib/config.ts` lê `VITE_EMPRESA_ID`. Quando
  definido, `hooks/use-empresa.ts` garante que o cliente esteja no programa dessa
  padaria — se não estiver, chama `POST /cliente/:empresaId/entrar` uma vez ao
  logar. Sem a env, usa o primeiro vínculo existente e, se não houver, o vínculo
  nasce quando o balcão lê o QR/CPF (a tela do Cartão mostra "Mostrar meu código"
  mesmo sem vínculo, pra não travar o cliente novo). `GET /cliente/empresas`
  traz `corPrimaria`, `corSecundaria`, `corTexto`, `corFundo`, `exibirTotalGasto`,
  `totalGasto` e aplica o tema da
  padaria via `lib/theme.ts::applyEmpresaTheme`: `--brand`, `--brand-contrast`
  (texto sobre a primária — com rede de proteção de contraste), `--brand-2`
  (secundária, usada no gradiente do cartão), `--color-canvas` (fundo, só se o
  texto escuro continuar legível) e `<meta theme-color>`. `resetTheme()` ao sair
  de `/app`.
- **Telas** (`cliente/pages/`): `login` (alternador Entrar/Criar conta, campos
  grandes de `components/field.tsx`), `cartao` (cartão da marca com gradiente
  `--brand→--brand-2`, saldo enorme, opcional "total em compras" se
  `exibirTotalGasto`, e o botão **"Mostrar meu código"** que abre a folha cheia
  `components/code-sheet.tsx` com o QR de identidade — renova a cada 45 s via
  `POST /cliente/qr`), `recompensas` (cartões grandes; quando não dá, barra de
  progresso "faltam N pontos"), `resgate/:id` (`components/big-code.tsx` +
  contagem + _polling_ de `GET /cliente/resgates/:id` até `confirmado`; guarda o
  pendente em `lib/pending-resgate.ts` pra reabrir), `extrato` (datas amigáveis
  "Hoje/Ontem"), `perfil` (instalar, sair, **excluir conta** →
  `DELETE /auth/cliente/me`).
- **Cara de app / acessível para idosos**: `components/screen.tsx` (título 22px,
  respiro grande), `components/tab-bar.tsx` (4 abas, ícones 22px, pílula ativa,
  `safe-area-inset-bottom`), botões `h-14`+ e texto ≥15px, rótulos sempre
  visíveis nos campos, `100dvh`, `viewport-fit=cover`. `components/install-prompt.tsx`
  captura `beforeinstallprompt` (Android/desktop) e mostra o passo a passo no iOS.
- **QR sob demanda**: o código não fica exposto na tela — abre por botão, em
  tela cheia bem clara, tanto na compra (Cartão → "Mostrar meu código") quanto
  no resgate (tela `resgate/:id`).
- **Gamificação (pacote 1)** no Cartão: emblema de **nível** (Pãozinho → Baguete
  → Mestre Padeiro, por `pontosAcumulados` = soma das entradas de
  `movimentacao_pontos`, calculado no backend em `portalCliente.service.ts`),
  barra de progresso pro próximo nível, **anel** (`components/progress-ring.tsx`)
  até o prêmio mais próximo que ele quase alcança, comemoração **"+N pontos!"**
  quando o saldo sobe desde a última visita (compara com localStorage), e uma
  linha de **selos** ("Primeira compra", "1 ano de casa", nível). Tudo deriva de
  `/cliente/empresas` (+ `nivel`, `proximoNivel`, `pontosAcumulados`, `desde`) e
  do catálogo — sem tabela nova.
- Escala visual **enxugada** depois da 1ª versão (era grande demais): saldo 36px,
  botões `h-12`, texto de corpo 13–15px, tab bar mais compacta. O QR continua
  grande (leitura à distância).
- **QR**: `lib/qr.ts` gera um SVG nítido (data URI) com `qrcode-generator` — sem
  canvas nem HTML de terceiros.
- Reaproveita o design-system (`components/ui/*`, `components/shared/confirm-dialog`,
  `lib/masks`, `lib/errors`) e o `ToastProvider`/`QueryClientProvider` do topo.

**Pendências**: persistência offline dos dados (hoje só o _shell_ é cacheado pelo
SW); ícones PNG dedicados para iOS (o manifesto usa SVG); login por código
(SMS/WhatsApp) no lugar de senha.

## Layout do shell

Em `lg+` o shell é `h-dvh` e `overflow-hidden`: a sidebar (224px) e a área de
conteúdo têm rolagem própria — o `<main>` é o container de scroll. Em telas
menores volta ao fluxo natural (a página rola pelo body). O conteúdo ocupa toda
a largura disponível (sem `max-width`), com gutters curtos (`lg:px-4`).

## Dashboard

Combina três endpoints existentes — `/dashboard`, `/recompensas`, `/promocoes` —
usando as mesmas `queryKey` das outras telas (cache compartilhado, sem request
extra ao navegar). Os KPIs são **razões derivadas** dos números reais (ticket
médio, pontos por cliente, taxa de resgate), não dados inventados. Cada painel
tem seu próprio estado de loading/erro; os gráficos (Recharts) leem cores via
CSS vars (`--color-chart-*`) e são personalizáveis pelo usuário (tipo de gráfico
e unidade). Cada painel traz uma leitura interpretativa por regras
determinísticas (ex.: "N campanhas paradas em rascunho").

Em `lg+` a tela é **fixa na viewport, sem rolagem**: raiz `h-full` +
`grid-rows-[auto_auto_minmax(0,1fr)]`, faixa de KPIs `shrink-0`, e a grade de
gráficos (`grid-cols-12 grid-rows-2`, `flex-1 min-h-0`) absorve o espaço restante
— cada painel é `flex-col overflow-hidden` e os gráficos escalam com o container.
Abaixo de `lg` os painéis empilham com alturas mínimas menores e a página rola
normalmente.

## Segurança — limitações conhecidas

- **Token em `localStorage`** (`fidelidade_token`). É legível por qualquer script
  na página, portanto vulnerável a XSS. A proteção correta exige **backend**:
  emitir o token em cookie `HttpOnly; Secure; SameSite`. Enquanto isso, o
  frontend mitiga com: nenhuma renderização de HTML não sanitizado, logout
  automático em 401 (`setUnauthorizedHandler`) e escrita/leitura de storage
  sempre encapsulada em `try/catch`.
- A `VITE_API_URL` (ver `.env.example`) é pública por natureza — não é segredo.
- Não há segredos no código do frontend; autorização por papel
  (`gestor`/`atendente`) é decidida pelo backend.

## Observações

- Paginação de clientes/compras é feita **no servidor**; a busca em Clientes
  filtra apenas a página carregada (rotulado na UI).
- Rotas são carregadas sob demanda (`React.lazy`); o dashboard, que usa Recharts,
  fica isolado num chunk próprio (~114 KB gzip) que só carrega nessa rota.
- Recharts é a maior dependência do bundle. Se o tamanho se tornar crítico,
  avaliar uma biblioteca de gráficos mais leve.
