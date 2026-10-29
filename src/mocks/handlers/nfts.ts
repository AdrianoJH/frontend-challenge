import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { applyNetwork } from '../network';
import { getScenario } from '../scenarios';
import { env } from '@/lib/env';
import { error } from './_util';
import type { ChainId, NftCategory, NftListParams, NftSort } from '@/types';

const base = env.apiUrl;

function parseParams(url: URL): NftListParams {
  const p = url.searchParams;
  const list = (key: string) => p.getAll(key).flatMap((v) => v.split(',')).filter(Boolean);
  return {
    q: p.get('q') ?? undefined,
    categories: list('categories') as NftCategory[],
    chains: list('chains') as ChainId[],
    minPrice: p.get('minPrice') ?? undefined,
    maxPrice: p.get('maxPrice') ?? undefined,
    sort: (p.get('sort') as NftSort) ?? undefined,
    page: p.get('page') ? Number(p.get('page')) : undefined,
    pageSize: p.get('pageSize') ? Number(p.get('pageSize')) : undefined,
    availableOnly: p.get('availableOnly') === 'true',
  };
}

export const nftHandlers = [
  http.get(`${base}/nfts/featured`, async () => {
    const net = await applyNetwork();
    if (net) return net;
    return HttpResponse.json({ items: db.featuredNfts() });
  }),

  http.get(`${base}/nfts/:idOrSlug`, async ({ params }) => {
    const net = await applyNetwork();
    if (net) return net;
    const nft = db.getNft(String(params.idOrSlug));
    if (!nft) return error(404, { code: 'not_found', message: 'NFT não encontrado.' });
    return HttpResponse.json(nft);
  }),

  http.get(`${base}/nfts`, async ({ request }) => {
    const net = await applyNetwork();
    if (net) return net;

    if (getScenario().network.forceEmptyCatalog) {
      return HttpResponse.json({ items: [], page: 1, pageSize: 12, total: 0, totalPages: 1 });
    }

    const result = db.listNfts(parseParams(new URL(request.url)));
    return HttpResponse.json(result);
  }),
];
