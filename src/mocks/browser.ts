import { setupWorker } from 'msw/browser';
import { restHandlers } from './handlers';
import { socketHandler } from './socket';

export const worker = setupWorker(...restHandlers, socketHandler);

export async function startMocks(): Promise<void> {
  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledRequest: 'bypass',
    quiet: true,
  });
}
