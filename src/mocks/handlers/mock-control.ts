import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { resetNetworkCounter } from '../network';
import { env } from '@/lib/env';
import { getScenario, resetScenario, setFlags, setScenario, type ScenarioName, type BusinessFlags } from '../scenarios';
import { pushRealtimeEvent } from '../socket';
import type { RealtimeEnvelope } from '@/types';

const base = env.apiUrl;

export const mockControlHandlers = [
  http.post(`${base}/__mock__/reset`, async () => {
    db.reset();
    resetScenario();
    resetNetworkCounter();
    return HttpResponse.json({ ok: true, scenario: 'default' });
  }),

  http.post(`${base}/__mock__/scenario`, async ({ request }) => {
    const { name } = (await request.json()) as { name: ScenarioName };
    const scenario = setScenario(name);
    return HttpResponse.json({ ok: true, scenario });
  }),

  http.post(`${base}/__mock__/flags`, async ({ request }) => {
    const patch = (await request.json()) as Partial<BusinessFlags>;
    const flags = setFlags(patch);
    return HttpResponse.json({ ok: true, flags });
  }),

  http.get(`${base}/__mock__/state`, async () => {
    return HttpResponse.json(getScenario());
  }),

  http.post(`${base}/__mock__/reprice`, async ({ request }) => {
    const body = (await request.json()) as { nftId: string; price?: string; editionsAvailable?: number };
    const nft = db.updateNft(body.nftId, { price: body.price, editionsAvailable: body.editionsAvailable });
    if (!nft) return HttpResponse.json({ ok: false }, { status: 404 });
    return HttpResponse.json({ ok: true, nft });
  }),

  http.post(`${base}/__mock__/emit`, async ({ request }) => {
    const body = (await request.json()) as {
      event: 'nft.updated' | 'order.updated';
      envelope: RealtimeEnvelope<unknown>;
    };
    pushRealtimeEvent(body.event, body.envelope);
    return HttpResponse.json({ ok: true });
  }),
];
