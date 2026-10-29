import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { applyNetwork } from '../network';
import { env } from '@/lib/env';
import { error, isAuthResponse, requireAuth } from './_util';
import type { WalletInput } from '@/types';

const base = env.apiUrl;
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function validate(body: Partial<WalletInput>): Record<string, string> {
  const fields: Record<string, string> = {};
  if (body.label !== undefined && !body.label.trim()) fields.label = 'Informe um rótulo.';
  if (body.address !== undefined && !ADDRESS_RE.test(body.address)) fields.address = 'Endereço inválido (0x + 40 hex).';
  return fields;
}

export const walletHandlers = [
  http.get(`${base}/wallets`, async ({ request }) => {
    const net = await applyNetwork();
    if (net) return net;
    const auth = requireAuth(request);
    if (isAuthResponse(auth)) return auth;
    return HttpResponse.json({ items: db.getWallets(auth.userId) });
  }),

  http.post(`${base}/wallets`, async ({ request }) => {
    const net = await applyNetwork();
    if (net) return net;
    const auth = requireAuth(request);
    if (isAuthResponse(auth)) return auth;

    const body = (await request.json()) as WalletInput;
    const fields = validate(body);
    if (!body.label?.trim()) fields.label = 'Informe um rótulo.';
    if (!body.address) fields.address = 'Informe o endereço.';
    if (Object.keys(fields).length) {
      return error(422, { code: 'validation', message: 'Verifique os campos.', fields });
    }
    return HttpResponse.json(db.addWallet(auth.userId, body), { status: 201 });
  }),

  http.patch(`${base}/wallets/:id`, async ({ request, params }) => {
    const net = await applyNetwork();
    if (net) return net;
    const auth = requireAuth(request);
    if (isAuthResponse(auth)) return auth;

    const body = (await request.json()) as Partial<WalletInput>;
    const fields = validate(body);
    if (Object.keys(fields).length) {
      return error(422, { code: 'validation', message: 'Verifique os campos.', fields });
    }
    const wallet = db.updateWallet(auth.userId, String(params.id), body);
    if (!wallet) return error(404, { code: 'not_found', message: 'Carteira não encontrada.' });
    return HttpResponse.json(wallet);
  }),
];
