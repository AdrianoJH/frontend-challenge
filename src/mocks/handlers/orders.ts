import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { applyNetwork } from '../network';
import { getScenario } from '../scenarios';
import { env } from '@/lib/env';
import { error, isAuthResponse, now, requireAuth } from './_util';
import type { CreateOrderInput } from '@/types';

const base = env.apiUrl;

const SETTLE_DELAY_MS = 1500;
const TIMEOUT_HANG_MS = 6000;

function scheduleSettlement(userId: string, orderId: string): void {
  const outcome = getScenario().flags.orderOutcome;
  const terminal = outcome === 'rejected' ? 'rejected' : 'confirmed';
  setTimeout(() => db.settleOrder(userId, orderId, terminal, now()), SETTLE_DELAY_MS);
}

export const orderHandlers = [
  http.post(`${base}/orders`, async ({ request }) => {
    const net = await applyNetwork();
    if (net) return net;

    const auth = requireAuth(request);
    if (isAuthResponse(auth)) return auth;

    const idemKey = request.headers.get('Idempotency-Key');
    if (!idemKey) {
      return error(422, { code: 'validation', message: 'Idempotency-Key obrigatório.' });
    }
    const body = (await request.json()) as CreateOrderInput;

    // mesma chave = mesmo pedido; chave repetida com payload diferente = conflito
    const existing = db.findOrderByIdem(idemKey);
    if (existing) {
      if (!existing.sameUser(auth.userId)) {
        return error(403, { code: 'forbidden', message: 'Chave de idempotência de outro usuário.' });
      }
      const sameHash = existing.payloadHash === hashBody(body);
      if (!sameHash) {
        return error(409, { code: 'conflict', message: 'Chave de idempotência reutilizada com conteúdo diferente.' });
      }
      return HttpResponse.json(existing.order, { status: 200 });
    }

    // revalida a cotação; se mudou, força re-confirmação
    const fresh = db.buildQuote({ chain: body.chain, items: body.items, couponCode: body.couponCode }, now());
    if (fresh.quoteId !== body.quoteId) {
      return error(409, {
        code: 'conflict',
        message: 'A cotação mudou. Revise os valores e confirme novamente.',
      });
    }

    for (const line of fresh.lines) {
      if (line.quantity > line.availableEditions) {
        return error(409, { code: 'availability', message: `Edição esgotada para ${line.name}.` });
      }
    }

    const order = db.createOrder(auth.userId, idemKey, body, now());
    scheduleSettlement(auth.userId, order.id);

    // cenario timeout: pedido já persistido, mas a resposta trava
    if (getScenario().flags.orderOutcome === 'timeout') {
      await new Promise((r) => setTimeout(r, TIMEOUT_HANG_MS));
    }

    return HttpResponse.json(order, { status: 201 });
  }),

  http.get(`${base}/orders/:id`, async ({ request, params }) => {
    const net = await applyNetwork();
    if (net) return net;
    const auth = requireAuth(request);
    if (isAuthResponse(auth)) return auth;
    let order = db.getOrder(auth.userId, String(params.id));
    if (!order) return error(404, { code: 'not_found', message: 'Pedido não encontrado.' });
    // Recuperação após refresh: o timer de settle vive no contexto da página e é
    // perdido num reload. Se o pedido segue pendente além do tempo, liquida na leitura.
    if (order.status === 'pending' && now() - new Date(order.createdAt).getTime() > SETTLE_DELAY_MS) {
      const outcome = getScenario().flags.orderOutcome === 'rejected' ? 'rejected' : 'confirmed';
      order = db.settleOrder(auth.userId, order.id, outcome, now()) ?? order;
    }
    return HttpResponse.json(order);
  }),

  http.get(`${base}/orders`, async ({ request }) => {
    const net = await applyNetwork();
    if (net) return net;
    const auth = requireAuth(request);
    if (isAuthResponse(auth)) return auth;
    return HttpResponse.json({ items: db.getOrders(auth.userId) });
  }),
];

function hashBody(obj: unknown): string {
  const s = JSON.stringify(obj);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
