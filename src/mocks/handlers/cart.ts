import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { applyNetwork } from '../network';
import { env } from '@/lib/env';
import { cartOwnerKey, error, now } from './_util';

const base = env.apiUrl;

interface UpsertBody {
  nftId: string;
  quantity: number;
  additive?: boolean;
}

function cartResult(result: ReturnType<typeof db.upsertCartItem>) {
  if (result === 'not_found') return error(404, { code: 'not_found', message: 'NFT não encontrado.' });
  if (result === 'unavailable')
    return error(409, { code: 'availability', message: 'Quantidade indisponível para esta edição.' });
  return HttpResponse.json(result);
}

export const cartHandlers = [
  http.get(`${base}/cart`, async ({ request }) => {
    const net = await applyNetwork();
    if (net) return net;
    return HttpResponse.json(db.getCart(cartOwnerKey(request)));
  }),

  http.post(`${base}/cart/items`, async ({ request }) => {
    const net = await applyNetwork();
    if (net) return net;
    const body = (await request.json()) as UpsertBody;
    const result = db.upsertCartItem(cartOwnerKey(request), body.nftId, body.quantity, now(), body.additive ?? true);
    return cartResult(result);
  }),

  http.patch(`${base}/cart/items/:nftId`, async ({ request, params }) => {
    const net = await applyNetwork();
    if (net) return net;
    const body = (await request.json()) as { quantity: number };
    const result = db.upsertCartItem(cartOwnerKey(request), String(params.nftId), body.quantity, now(), false);
    return cartResult(result);
  }),

  http.delete(`${base}/cart/items/:nftId`, async ({ request, params }) => {
    const net = await applyNetwork();
    if (net) return net;
    const cart = db.removeCartItem(cartOwnerKey(request), String(params.nftId), now());
    return HttpResponse.json(cart);
  }),
];
