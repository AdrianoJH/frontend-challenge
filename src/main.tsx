import { env } from './lib/env';
import './index.css';

// Importante: os mocks sobem ANTES de importar o app. O engine.io-client captura
// window.WebSocket no load do módulo, então o MSW precisa já ter aplicado o patch
// do WebSocket antes de o socket.io-client ser avaliado.
async function main(): Promise<void> {
  if (env.enableMocks) {
    const { startMocks } = await import('./mocks/browser');
    await startMocks();
  }
  const { renderApp } = await import('./bootstrap');
  renderApp();
}

main();
