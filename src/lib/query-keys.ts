import type { NftListParams } from '@/types';

export const queryKeys = {
  session: ['session'] as const,

  nfts: {
    all: ['nfts'] as const,
    list: (params: NftListParams) => ['nfts', 'list', normalizeParams(params)] as const,
    featured: () => ['nfts', 'featured'] as const,
    detail: (idOrSlug: string) => ['nfts', 'detail', idOrSlug] as const,
  },

  favorites: (userId: string) => ['favorites', userId] as const,
  cart: (userId: string) => ['cart', userId] as const,
  wallets: (userId: string) => ['wallets', userId] as const,
  profile: (userId: string) => ['profile', userId] as const,
  orders: {
    all: (userId: string) => ['orders', userId] as const,
    detail: (userId: string, orderId: string) => ['orders', userId, orderId] as const,
  },
} as const;

function normalizeParams(params: NftListParams): Record<string, unknown> {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => [k, Array.isArray(v) ? [...v].sort() : v] as const)
    .sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries);
}
