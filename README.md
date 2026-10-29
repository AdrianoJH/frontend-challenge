# NFT Marketplace

Marketplace de NFTs (SPA React) feito como desafio de frontend. Cobre catálogo com busca/filtros, detalhe do NFT, favoritos, carrinho, cotação, checkout com carteira, confirmação de pedido, perfil e carteiras.

Não tem backend: toda a camada de dados (REST + Socket.IO) é simulada no navegador com MSW, e isso vale também para o build publicado. O layout segue o Figma do desafio; os desvios conscientes estão em [ARCHITECTURE.md](./ARCHITECTURE.md#limitações-decisões-de-ux-e-desvios-do-figma).

## Stack

- React + TypeScript, Vite
- TanStack Router (rotas por arquivo em `src/routes`) e TanStack Query
- Axios (interceptors de token, visitor id e normalização de erro)
- Socket.IO (`socket.io-client`) para tempo real
- MSW + `@mswjs/socket.io-binding` para os mocks de REST e de WebSocket
- Tailwind + shadcn/ui
- Zod + React Hook Form
- Playwright (e2e desktop e mobile) e Lighthouse

## Rodando

Precisa de Node 20+ e npm.

```bash
npm install
npm run dev        # http://localhost:5173
```

O worker do MSW já está versionado em `public/mockServiceWorker.js`. Os mocks sobem antes do app (`src/main.tsx`) — o worker precisa instrumentar o `WebSocket` antes do `socket.io-client` rodar.

Para gerar o build e servi-lo localmente:

```bash
npm run build      # tsc -b && vite build
npm run preview    # http://localhost:4173
```

Os mocks continuam ligados no build de produção (`VITE_ENABLE_MOCKS` fica `true`), então a URL publicada funciona sem nenhum serviço externo. Mantenha a variável como `true` no deploy.

## Variáveis de ambiente

Tem um `.env.example` na raiz, mas todas as variáveis têm default em `src/lib/env.ts` — o app roda sem `.env`.

| Variável | Default | Para quê |
|----------|---------|----------|
| `VITE_ENABLE_MOCKS` | `true` | Liga os mocks (REST + Socket.IO). Deixe `true`. |
| `VITE_API_URL` | `/api` | Prefixo da API, interceptado pelo MSW. |
| `VITE_SOCKET_URL` | `/` | URL do Socket.IO, também interceptada. |
| `VITE_MOCK_SCENARIO` | `default` | Cenário inicial: `default`, `empty`, `slow`, `flaky` ou `offline`. |

## Credenciais

Usuários do seed (`src/mocks/data/fixtures.ts`), ambos com senha `Password123!`:

- `collector@nftm.dev`
- `trader@nftm.dev`

Dá pra criar conta nova pela tela de cadastro (senha mínima de 8 caracteres). O carrinho do visitante é mesclado ao do usuário no login/cadastro.

## Comandos

| Comando | |
|---------|--|
| `npm run dev` | dev server com mocks |
| `npm run build` | `tsc -b && vite build` |
| `npm run preview` | serve o build |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright (faz `build && preview` sozinho) |
| `npm run test:e2e:ui` | Playwright em modo UI |
| `npm run test:report` | abre o último relatório |
| `npm run lighthouse` | auditoria Lighthouse |

Os testes rodam em `chromium-desktop` (1440×900) e `chromium-mobile` (Pixel 5).

## Qualidade (Lighthouse)

O `scripts/lighthouse.mjs` audita a Início e o Detalhe em mobile e desktop, roda cada combinação três vezes e reporta a mediana. Sem argumento ele mira o preview local (`http://localhost:4173`); passando uma URL, audita o ambiente publicado:

```bash
npm run build
npm run preview                 # em outro terminal
npm run lighthouse              # local
npm run lighthouse -- https://frontend-challenge-mocha.vercel.app   # publicado
```

Medições da URL publicada (mediana de 3), todas acima das metas do desafio (Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90):

| Página | Perfil | Performance | Accessibility | Best Practices | SEO |
|--------|--------|------------:|--------------:|---------------:|----:|
| Início | mobile | 95 | 97 | 100 | 92 |
| Início | desktop | 100 | 97 | 100 | 92 |
| Detalhe | mobile | 98 | 100 | 100 | 92 |
| Detalhe | desktop | 99 | 100 | 100 | 92 |

Os relatórios HTML/JSON completos vão para `lighthouse-reports/` (fora do versionamento).

## Cenários de mock e reset

A configuração dos mocks tem duas partes (ver `src/mocks/scenarios.ts`):

- **Cenário de rede** — `default`, `empty`, `slow`, `flaky`, `offline`. Controla latência, taxa de falha, catálogo vazio e offline.
- **Flags de negócio** — `orderOutcome` (`confirmed` | `rejected` | `timeout`), `repriceNftId` e `forceSessionExpired`.

Tudo isso fica em `localStorage` (`nftm.mock.scenario`, `nftm.mock.flags`) e o banco em `nftm.db.v1`.

Com os mocks ligados, o `ScenarioSwitcher` aparece no layout com os cenários e um botão de **Reset** (volta o banco pro seed e o cenário pro `default`). Também dá pra controlar tudo pelos endpoints interceptados em `src/mocks/handlers/mock-control.ts`:

| Rota | Efeito |
|------|--------|
| `POST /api/__mock__/reset` | reseta banco, cenário e flags |
| `POST /api/__mock__/scenario` `{ name }` | troca o cenário de rede |
| `POST /api/__mock__/flags` `{ ... }` | ajusta as flags de negócio |
| `GET /api/__mock__/state` | cenário + flags atuais |
| `POST /api/__mock__/reprice` `{ nftId, price?, editionsAvailable? }` | muda preço/estoque e emite `nft.updated` |
| `POST /api/__mock__/emit` `{ event, envelope }` | emite um evento de tempo real |

Nos testes, os helpers de `tests/e2e/helpers.ts` (`resetMocks`, `setScenario`, `setFlags`, `reprice`, `emitEvent`) embrulham essas chamadas.

## Reproduzindo os fluxos de falha

Dá pra disparar tudo pelos endpoints acima (ou pelo console do navegador com `fetch`). Depois é só dar Reset.

**Cupom inválido / expirado / mínimo.** Na tela do carrinho, aplique um cupom. Os do seed: `WELCOME10` (10%, válido), `ETH20` (20%, exige subtotal ≥ 2 ETH), `EXPIRED5` (expirado). Qualquer outro código é inválido. A cotação devolve o cupom com `valid: false` e o motivo, sem travar o resumo.

**Timeout de pedido com recuperação.**

```js
await fetch('/api/__mock__/flags', { method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ orderOutcome: 'timeout' }) });
```

No checkout, o `POST /orders` persiste o pedido mas segura a resposta além do timeout do Axios (4s). O checkout reenvia com a mesma Idempotency-Key, recupera o mesmo pedido e vai pra confirmação. Mesmo recarregando a página, o `GET /orders/:id` liquida o pendente que ficou órfão.

**Pagamento recusado.** Mesma ideia com `orderOutcome: 'rejected'`. O pedido entra `pending` e, depois de ~1,5s, vira `rejected` via `order.updated`; a confirmação mostra o motivo.

**Sessão expirada.** Com `forceSessionExpired: true`, a próxima requisição autenticada volta `401`: o interceptor avisa o `AuthProvider`, que limpa o token e o cache privado, e as rotas protegidas mandam pro `/login`. (As sessões também caem sozinhas depois de 30 min.)

**Reprecificação no checkout.** Use `repriceNftId` (arma +20% no próximo quote com aquele NFT) ou `POST /api/__mock__/reprice` pra mudar o preço e emitir o evento. A nova cotação gera outro `quoteId`; o `POST /orders` percebe e devolve `409`, obrigando a revisar antes de confirmar.

**Rede lenta/instável/offline.** Troque o cenário pra `slow`, `flaky` ou `offline`. No `flaky`, 1 a cada ~3 requisições falha com `503` (o Query repete até 2x); no `offline`, caem como erro de rede.

Os detalhes de arquitetura (contratos, eventos, cache, idempotência) estão em [ARCHITECTURE.md](./ARCHITECTURE.md).
