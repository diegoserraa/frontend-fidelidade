# Fideliza+ — Painel

Painel SaaS para gestão de um programa de fidelidade (clientes, compras, pontos,
recompensas, promoções, usuários e configuração da marca).

## Stack

React 19 · Vite · TypeScript · Tailwind CSS v4 · React Router · TanStack Query ·
Recharts · lucide-react · PWA (vite-plugin-pwa).

## Desenvolvimento

```bash
npm install
cp .env.example .env      # ajuste VITE_API_URL se necessário
npm run dev
```

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | typecheck (`tsc -b`) + build de produção |
| `npm run lint` | oxlint |
| `npm run preview` | serve o build local |

## Configuração

- `VITE_API_URL` — URL base da API, sem barra final. Padrão:
  `http://localhost:3000/api`.

## Documentação

- [`docs/arquitetura.md`](docs/arquitetura.md) — camadas, design system, padrões
  de tela e limitações de segurança conhecidas.
