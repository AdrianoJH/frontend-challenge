import { api } from '@/lib/axios';
import type {
  Cart,
  CreateOrderInput,
  Credentials,
  FavoritesResponse,
  Nft,
  NftListParams,
  Order,
  Paginated,
  PasswordChangeInput,
  ProfileInput,
  Quote,
  QuoteInput,
  RegisterInput,
  Session,
  User,
  Wallet,
  WalletInput,
} from '@/types';

export const authApi = {
  register: (input: RegisterInput) => api.post<Session>('/auth/register', input).then((r) => r.data),
  login: (input: Credentials) => api.post<Session>('/auth/login', input).then((r) => r.data),
  session: (signal?: AbortSignal) => api.get<Session>('/auth/session', { signal }).then((r) => r.data),
  logout: () => api.post('/auth/logout').then(() => undefined),
};

function toQuery(params: NftListParams): Record<string, string> {
  const q: Record<string, string> = {};
  if (params.q) q.q = params.q;
  if (params.categories?.length) q.categories = params.categories.join(',');
  if (params.chains?.length) q.chains = params.chains.join(',');
  if (params.minPrice) q.minPrice = params.minPrice;
  if (params.maxPrice) q.maxPrice = params.maxPrice;
  if (params.sort) q.sort = params.sort;
  if (params.page) q.page = String(params.page);
  if (params.pageSize) q.pageSize = String(params.pageSize);
  if (params.availableOnly) q.availableOnly = 'true';
  return q;
}

export const nftApi = {
  list: (params: NftListParams, signal?: AbortSignal) =>
    api.get<Paginated<Nft>>('/nfts', { params: toQuery(params), signal }).then((r) => r.data),
  featured: (signal?: AbortSignal) =>
    api.get<{ items: Nft[] }>('/nfts/featured', { signal }).then((r) => r.data.items),
  detail: (idOrSlug: string, signal?: AbortSignal) =>
    api.get<Nft>(`/nfts/${idOrSlug}`, { signal }).then((r) => r.data),
};

export const favoriteApi = {
  list: (signal?: AbortSignal) => api.get<FavoritesResponse>('/favorites', { signal }).then((r) => r.data.nftIds),
  add: (nftId: string) => api.put<FavoritesResponse>(`/favorites/${nftId}`).then((r) => r.data.nftIds),
  remove: (nftId: string) => api.delete<FavoritesResponse>(`/favorites/${nftId}`).then((r) => r.data.nftIds),
};

export const cartApi = {
  get: (signal?: AbortSignal) => api.get<Cart>('/cart', { signal }).then((r) => r.data),
  addItem: (nftId: string, quantity: number, additive = true) =>
    api.post<Cart>('/cart/items', { nftId, quantity, additive }).then((r) => r.data),
  setQuantity: (nftId: string, quantity: number) =>
    api.patch<Cart>(`/cart/items/${nftId}`, { quantity }).then((r) => r.data),
  removeItem: (nftId: string) => api.delete<Cart>(`/cart/items/${nftId}`).then((r) => r.data),
};

export const quoteApi = {
  create: (input: QuoteInput, signal?: AbortSignal) =>
    api.post<Quote>('/quote', input, { signal }).then((r) => r.data),
};

export const orderApi = {
  create: (input: CreateOrderInput, idempotencyKey: string) =>
    api
      .post<Order>('/orders', input, {
        headers: { 'Idempotency-Key': idempotencyKey },
        timeout: 4000,
      })
      .then((r) => r.data),
  get: (id: string, signal?: AbortSignal) => api.get<Order>(`/orders/${id}`, { signal }).then((r) => r.data),
  list: (signal?: AbortSignal) => api.get<{ items: Order[] }>('/orders', { signal }).then((r) => r.data.items),
};

export const profileApi = {
  get: (signal?: AbortSignal) => api.get<User>('/profile', { signal }).then((r) => r.data),
  update: (input: ProfileInput) => api.patch<User>('/profile', input).then((r) => r.data),
  changePassword: (input: PasswordChangeInput) => api.post('/profile/password', input).then(() => undefined),
};

export const walletApi = {
  list: (signal?: AbortSignal) => api.get<{ items: Wallet[] }>('/wallets', { signal }).then((r) => r.data.items),
  add: (input: WalletInput) => api.post<Wallet>('/wallets', input).then((r) => r.data),
  update: (id: string, input: Partial<WalletInput>) => api.patch<Wallet>(`/wallets/${id}`, input).then((r) => r.data),
};
