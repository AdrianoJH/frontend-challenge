import { ws } from 'msw';
import { toSocketIo } from '@mswjs/socket.io-binding';
import { db } from './db';
import { now } from './handlers/_util';
import type {
  NftUpdatedEvent,
  OrderUpdatedEvent,
  RealtimeEnvelope,
} from '@/types';

// O matching por path do ws.link não casa de forma confiável a URL do Socket.IO
// (barra final + query), então interceptamos qualquer WS e filtramos no handler.
export const socketLink = ws.link('*');

type Io = ReturnType<typeof toSocketIo>;

interface ClientState {
  io: Io;
  userId: string | null;
  heartbeat: ReturnType<typeof setInterval>;
}

const clients = new Set<ClientState>();

function envelope<T>(
  type: 'nft' | 'order',
  id: string,
  version: number,
  data: T,
  userId?: string,
): RealtimeEnvelope<T> {
  return {
    eventId: `${type}.${id}.v${version}`,
    resource: { type, id },
    version,
    emittedAt: new Date(now()).toISOString(),
    userId,
    data,
  };
}

function broadcastNft(payload: NftUpdatedEvent): void {
  for (const c of clients) c.io.client.emit('nft.updated', payload);
}

function deliverOrder(payload: OrderUpdatedEvent): void {
  for (const c of clients) {
    if (c.userId && c.userId === payload.userId) {
      c.io.client.emit('order.updated', payload);
    }
  }
}

db.on('nft.updated', (p) => {
  broadcastNft(envelope('nft', p.id, p.version, p));
});
db.on('order.updated', ({ userId, order }) => {
  deliverOrder(
    envelope(
      'order',
      order.id,
      order.version,
      { id: order.id, status: order.status, txHash: order.txHash, rejectionReason: order.rejectionReason, version: order.version },
      userId,
    ),
  );
});

export function pushRealtimeEvent(event: 'nft.updated' | 'order.updated', payload: RealtimeEnvelope<unknown>): void {
  if (event === 'nft.updated') {
    for (const c of clients) c.io.client.emit('nft.updated', payload);
  } else {
    for (const c of clients) if (c.userId === payload.userId) c.io.client.emit('order.updated', payload);
  }
}

export const socketHandler = socketLink.addEventListener('connection', (connection) => {
  // Só tratamos o Socket.IO; qualquer outro WS (ex.: HMR do Vite) segue direto.
  if (!/\/socket\.io\//.test(connection.client.url.toString())) {
    connection.server.connect();
    return;
  }
  const io = toSocketIo(connection as never);
  const state: ClientState = {
    io,
    userId: null,
    // keepalive EIO4: manda PING ("2") periodicamente
    heartbeat: setInterval(() => {
      try {
        io.rawClient.send('2');
      } catch {
        /* client gone */
      }
    }, 20_000),
  };
  clients.add(state);

  io.client.on('subscribe', (_event, payload: { userId?: string | null }) => {
    state.userId = payload?.userId ?? null;
    io.client.emit('subscribed', { ok: true });
  });

  io.client.on('unsubscribe', () => {
    state.userId = null;
  });

  connection.client.addEventListener('close', () => {
    clearInterval(state.heartbeat);
    clients.delete(state);
  });
});
