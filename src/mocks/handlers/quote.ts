import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { applyNetwork } from '../network';
import { getScenario, setFlags } from '../scenarios';
import { env } from '@/lib/env';
import { error, now } from './_util';
import { fromWei, toWei } from '@/lib/money';
import type { QuoteInput } from '@/types';

function bump20(price: string): string {
  return fromWei((toWei(price) * 120n) / 100n);
}

const base = env.apiUrl;

export const quoteHandlers = [
  http.post(`${base}/quote`, async ({ request }) => {
    const net = await applyNetwork();
    if (net) return net;

    const body = (await request.json()) as QuoteInput;
    if (!body.items?.length) {
      return error(422, { code: 'validation', message: 'Nenhum item para cotar.' });
    }

    // se tem reprice armado pra algum item, aplica +20% uma vez só
    const { flags } = getScenario();
    if (flags.repriceNftId && body.items.some((i) => i.nftId === flags.repriceNftId)) {
      const nft = db.getNft(flags.repriceNftId);
      if (nft) db.updateNft(nft.id, { price: bump20(nft.price) });
      setFlags({ repriceNftId: null });
    }

    for (const item of body.items) {
      if (!db.getNft(item.nftId)) {
        return error(404, { code: 'not_found', message: `NFT ${item.nftId} não encontrado.` });
      }
    }

    const quote = db.buildQuote(body, now());
    return HttpResponse.json(quote);
  }),
];
