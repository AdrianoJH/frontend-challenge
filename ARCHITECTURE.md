# Arquitetura

Notas técnicas do projeto: como o código está organizado, os contratos REST e eventos de tempo real, como funcionam sessão, carrinho, cache e idempotência, e onde a implementação se afasta do Figma.

Toda a camada de dados é simulada no navegador com MSW (REST + Socket.IO via `@mswjs/socket.io-binding`), inclusive no build publicado. Não existe backend.

## Organização

```
src/
├── main.tsx              # entrypoint: sobe os mocks antes do app
├── bootstrap.tsx         # providers (QueryClient, Router, Auth, Realtime, Toast)
├── routes/               # rotas por arquivo (TanStack Router)
│   ├── index.tsx         # home/catálogo
│   ├── nfts.$slug.tsx    # detalhe
│   ├── cart.tsx          # carrinho + cupom
│   ├── checkout.tsx      # pagamento
│   ├── order.$orderId.tsx
│   ├── login.tsx / register.tsx
│   ├── profile.tsx
│   └── wallets.tsx
├── features/             # hooks de Query + componentes por domínio
│   ├── auth/ cart/ favorites/ checkout/ account/ nfts/
├── api/index.ts          # contratos REST tipados (axios)
├── realtime/realtime.tsx # provider Socket.IO + aplicação de eventos no cache
├── mocks/                # camada MSW
│   ├── browser.ts        # setupWorker(restHandlers, socketHandler)
│   ├── handlers/         # um arquivo por recurso + mock-control
│   ├── db.ts             # banco em memória + localStorage, emite eventos
│   ├── socket.ts         # binding Socket.IO e envelope de eventos
│   ├── network.ts        # latência, falhas transientes, offline
│   ├── scenarios.ts      # cenários de rede + flags de negócio
│   └── data/fixtures.ts  # seed
├── lib/                  # axios, env, token, visitor, query-keys, guards, money
├── components/           # ui (shadcn), layout, nft, shared
└── types/index.ts
```

Algumas convenções: rotas privadas usam `beforeLoad: requireAuth(...)`; as chaves de cache ficam centralizadas em `src/lib/query-keys.ts`, escopadas por usuário; e valores em ETH são tratados como strings em wei (`BigInt`) no `src/lib/money.ts`, nunca como float.

## Contratos REST

Base em `VITE_API_URL` (`/api`). O cliente tipado está em `src/api/index.ts` e os handlers mock em `src/mocks/handlers/`. Toda requisição manda `X-Visitor-Id` e, quando há sessão, `Authorization: Bearer <token>`.

**Sessão e conta** (`handlers/auth.ts`)

| Operação | Rota |
|----------|------|
| Registrar | `POST /auth/register` → `{ token, user, expiresAt }`, mescla carrinho do visitante |
| Login | `POST /auth/login` → idem |
| Sessão atual | `GET /auth/session` |
| Logout | `POST /auth/logout` (revoga o token) |

**NFTs** (`handlers/nfts.ts`)

| Operação | Rota |
|----------|------|
| Listar | `GET /nfts` — `q, categories, chains, minPrice, maxPrice, sort, page, pageSize, availableOnly` |
| Destaques | `GET /nfts/featured` |
| Detalhe | `GET /nfts/:idOrSlug` (id ou slug; `404` se não existir) |

**Favoritos** (`handlers/favorites.ts`, requer sessão): `GET /favorites`, `PUT /favorites/:nftId`, `DELETE /favorites/:nftId` — todos devolvem `{ nftIds }`.

**Carrinho** (`handlers/cart.ts`). O dono é resolvido por `userId` (autenticado) ou `visitor:<X-Visitor-Id>`.

| Operação | Rota |
|----------|------|
| Obter | `GET /cart` (cria vazio se não existir) |
| Adicionar | `POST /cart/items` — `{ nftId, quantity, additive }` |
| Quantidade | `PATCH /cart/items/:nftId` — `{ quantity }` (`0` remove) |
| Remover | `DELETE /cart/items/:nftId` |

**Cotação** (`handlers/quote.ts`): `POST /quote` recebe `{ chain, items, couponCode? }` e devolve subtotal, desconto, taxa de rede, total, status do cupom e um `quoteId` (hash de preço/itens/desconto), com validade de 2 minutos.

**Pedidos** (`handlers/orders.ts`, requer sessão)

| Operação | Rota |
|----------|------|
| Criar | `POST /orders` — header `Idempotency-Key` obrigatório; revalida `quoteId` e disponibilidade |
| Obter | `GET /orders/:id` (liquida pedido pendente órfão na leitura) |
| Listar | `GET /orders` |

**Perfil** (`handlers/profile.ts`, requer sessão): `GET /profile`; `PATCH /profile` (`409` se e-mail em uso); `POST /profile/password` (`422` se senha atual errada ou nova < 8).

**Carteiras** (`handlers/wallets.ts`, requer sessão): `GET /wallets`; `POST /wallets` (`0x` + 40 hex, só uma `primary`); `PATCH /wallets/:id`.

### Erros

O corpo padrão é `{ code, message, fields? }`, e o interceptor do Axios normaliza tudo para `ApiError` (`src/lib/api-error.ts`), incluindo erros de rede e timeout do próprio Axios.

| HTTP | `code` | Quando |
|------|--------|--------|
| `422` | `validation` | campos inválidos (vem com `fields`) |
| `401` | `unauthorized` | token ausente/expirado |
| `403` | `forbidden` | Idempotency-Key de outro usuário |
| `404` | `not_found` | recurso inexistente |
| `409` | `conflict` | e-mail em uso, cotação mudou, chave reusada com payload diferente |
| `409` | `availability` | edição esgotada / quantidade indisponível |
| `503` | `transient` | cenário `flaky`/`offline` |
| — | `timeout` | resposta não chegou no prazo do Axios |

`ApiError.isRetriable` cobre `transient`, `timeout` e status ≥ 500 — é o que o retry do Query e a recuperação do checkout usam.

## Tempo real (Socket.IO)

O cliente abre um Socket.IO (`transports: ['websocket']`, `path: /socket.io/`) e o MSW intercepta o WebSocket com `ws.link('*')`, convertendo pra Socket.IO pelo `@mswjs/socket.io-binding` (`src/mocks/socket.ts`). WebSockets que não batem em `/socket.io/` (o HMR do Vite, por exemplo) são repassados pro servidor real.

Ao conectar, o cliente emite `subscribe { userId }` e o servidor passa a entregar eventos de pedido só pra aquele usuário. O envelope é:

```ts
{ eventId, resource: { type: 'nft' | 'order', id }, version, emittedAt, userId?, data }
```

`nft.updated` vai pra todos (`{ id, price, editionsAvailable, version }`); `order.updated` só pro dono (`{ id, status, txHash?, rejectionReason?, version }`). Os dois saem do `MockDb` quando o estado muda, e também dá pra disparar na mão por `POST /api/__mock__/emit` e `/reprice`.

Limitações do ambiente mock: não há servidor de verdade, então o binding simula o protocolo EIO4 e manda um ping de keepalive a cada 20s; o match por path do `ws.link` não casa a URL do Socket.IO de forma confiável (barra final + query), por isso interceptamos qualquer WS e filtramos `/socket.io/` dentro do handler; a assinatura por usuário é por conexão (refeita no reload); e "broadcast" só alcança os clientes daquela instância do worker.

## Sessão

O token vive no `localStorage` (`nftm.token`) e é injetado no `Authorization` pelo Axios. As sessões do mock expiram em 30 min, e o `AuthProvider` carrega `GET /auth/session` só quando há token (com `retry: false`).

Qualquer resposta `401` dispara `notifyUnauthorized()`: o `AuthProvider` limpa o token, zera o cache de sessão e chama `clearPrivateData`, que remove `favorites`, `cart`, `wallets`, `profile` e `orders`. A mesma limpeza acontece quando o `userId` muda, pra não vazar dados entre contas. As rotas protegidas (checkout, profile, wallets) redirecionam pro `/login?redirect=<href>` quando não há token.

## Carrinho

O carrinho é server-side no mock (dentro do banco em `localStorage`), chaveado por `userId` ou `visitor:<X-Visitor-Id>` — o visitor id é gerado e guardado em `nftm.visitor`. Cada item guarda o `unitPrice` do momento em que foi adicionado junto com o `nft` atual (preço/estoque/versão), o que deixa a UI sinalizar quando o preço mudou.

No login/cadastro, se o header de visitante estiver presente, `db.mergeCart` soma os itens do carrinho anônimo ao do usuário e descarta o anônimo. No cliente, a query do carrinho é atualizada direto pelas mutations e invalidada na reconexão do socket e depois de criar um pedido.

## Cache (TanStack Query)

Os defaults ficam em `src/lib/query-client.ts`: `staleTime` de 30s, `gcTime` de 5 min, refetch no foco, retry só pra erros retriáveis (até 2x, backoff exponencial) e mutations sem retry.

As chaves privadas (`favorites`, `cart`, `wallets`, `profile`, `orders`) são escopadas por usuário, e o `clearPrivateData` remove por raiz + escopo. A cotação (`useQuote`) usa `staleTime: 0` e é invalidada quando chega `nft.updated`, forçando uma nova cotação no checkout. Criar pedido invalida o carrinho; o toggle de favorito invalida favoritos no `onSettled`.

Duas interações usam atualização otimista com rollback — os favoritos e a quantidade do carrinho: o `onMutate` cancela as queries em voo, guarda o estado anterior e aplica a mudança no cache; o `onError` restaura; o `onSettled` invalida. O `cancelQueries` + o `AbortSignal` que o Query propaga pro Axios descartam respostas de queries já substituídas. Por fim, `useOrder` refaz a leitura a cada 2s enquanto o pedido está `pending` (rede de segurança caso um evento se perca) e para ao chegar num estado terminal.

## Reconciliação REST ↔ Socket.IO

Quando o socket (re)conecta, o cliente reemite `subscribe { userId }` e invalida `cart`, `orders` e o detalhe do NFT pela REST, recuperando o que tiver mudado durante a queda.

Pra não regredir estado, cada recurso guarda a última `version` aplicada e um conjunto dos `eventId` recentes (janela de 500): o evento é ignorado se já foi visto ou se a `version` é menor ou igual à última. `nft.updated` reescreve preço/estoque/versão na listagem, no detalhe e nas linhas do carrinho (mantendo o `unitPrice` original) e invalida a cotação; `order.updated` atualiza o pedido na lista e no detalhe, sempre checando `evt.userId === userId`. `confirmed` e `rejected` são estados finais — ao confirmar, o mock gera o `txHash`, baixa o estoque e tira os itens comprados do carrinho.

## Idempotência de pedidos

O fluxo está em `src/routes/checkout.tsx` + `handlers/orders.ts`. O checkout gera uma `Idempotency-Key` por tentativa de compra e reutiliza em todos os reenvios (também guarda a chave em `localStorage` antes de enviar). O `POST /orders` exige esse header — sem ele, `422`.

O mock indexa o pedido pela chave junto com um hash do payload:

- mesma chave + mesmo payload → devolve o pedido já criado, sem duplicar;
- mesma chave + payload diferente → `409`;
- chave de outro usuário → `403`.

Antes de criar, ainda revalida o `quoteId` (cotação mudou → `409`) e a disponibilidade de cada linha. No cenário de timeout, o pedido é persistido mas a resposta trava além do limite do Axios; o checkout captura o erro retriável e reenvia com a mesma chave, recebendo o mesmo pedido. Se a página for recarregada no meio, o `GET /orders/:id` liquida o pendente órfão na leitura.

## Limitações e desvios do Figma

Decisões gerais: tudo é mockado no cliente (inclusive no build publicado), o estado mora em `localStorage` e pode ser resetado por `/api/__mock__/reset`; a aritmética de ETH é em wei pra evitar erro de ponto flutuante; e as falhas transientes são determinísticas (contador de requisições) em vez de aleatórias, pra manter os testes reproduzíveis.

Onde fugi do Figma, de propósito:

- O checkout mantém um botão "Conectar carteira" que não existe no mockup, porque o fluxo e os testes de conexão dependem dele (no desktop ele some depois de conectar).
- As opções de "Carteira e rede" no desktop são ilustrativas (pill de redes, MetaMask, Coinbase Wallet) — quem vai pro `POST /orders` é a carteira que o usuário tem selecionada, não a opção clicada.
- O "THANK YOU" da confirmação usa o SVG exportado do Figma (`public/images/thank-you.svg`).
- As carteiras do seed viraram "Reserva" (polygon) e "Principal" (ethereum).
- Vários campos dos formulários de perfil/checkout/carteiras são só visuais (nome de usuário, nome do perfil, código de indicação, nome ENS, carteira secundária, observação) — só nome/e-mail e a carteira selecionada chegam na API.
- O perfil tem um único "Salvar" que grava perfil e senha de uma vez; o teste e2e de conta foi ajustado a isso.
- As asserções do e2e de confirmação passaram de "pedido confirmado" para "na sua carteira"/"transação confirmada", acompanhando o redesign.

Limitações de estilo do navegador: a máscara de senha usa os pontinhos nativos (não dá pra trocar por asterisco via CSS), e as cores do dropdown de `<option>` dependem do navegador.
