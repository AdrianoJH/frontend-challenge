import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { applyNetwork } from '../network';
import { env } from '@/lib/env';
import { isAuthResponse, requireAuth } from './_util';

const base = env.apiUrl;

export const favoriteHandlers = [
  http.get(`${base}/favorites`, async ({ request }) => {
    const net = await applyNetwork();
    if (net) return net;
    const auth = requireAuth(request);
    if (isAuthResponse(auth)) return auth;
    return HttpResponse.json({ nftIds: db.getFavorites(auth.userId) });
  }),

  http.put(`${base}/favorites/:nftId`, async ({ request, params }) => {
    const net = await applyNetwork();
    if (net) return net;
    const auth = requireAuth(request);
    if (isAuthResponse(auth)) return auth;
    const nftIds = db.addFavorite(auth.userId, String(params.nftId));
    return HttpResponse.json({ nftIds });
  }),

  http.delete(`${base}/favorites/:nftId`, async ({ request, params }) => {
    const net = await applyNetwork();
    if (net) return net;
    const auth = requireAuth(request);
    if (isAuthResponse(auth)) return auth;
    const nftIds = db.removeFavorite(auth.userId, String(params.nftId));
    return HttpResponse.json({ nftIds });
  }),
];
