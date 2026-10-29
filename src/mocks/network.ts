import { delay, HttpResponse } from 'msw';
import { getScenario } from './scenarios';
import type { ApiErrorBody } from '@/types';

let requestCounter = 0;

export function resetNetworkCounter(): void {
  requestCounter = 0;
}

function jsonError(status: number, body: ApiErrorBody) {
  return HttpResponse.json(body, { status });
}

export async function applyNetwork(): Promise<Response | null> {
  const { network } = getScenario();
  requestCounter += 1;

  if (network.offline) {
    await delay(network.latencyMax || 50);
    return HttpResponse.error();
  }

  const span = Math.max(0, network.latencyMax - network.latencyMin);
  const jitter = network.outOfOrder ? span : span / 2;
  const base = network.latencyMin + (requestCounter % 5) * (jitter / 5);
  await delay(Math.round(base));

  // falha transiente deterministica a cada 1/failureRate chamadas
  if (network.failureRate > 0) {
    const period = Math.max(2, Math.round(1 / network.failureRate));
    if (requestCounter % period === 0) {
      return jsonError(503, {
        code: 'transient',
        message: 'Serviço temporariamente indisponível. Tente novamente.',
      });
    }
  }

  return null;
}
