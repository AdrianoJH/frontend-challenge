import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { env } from '@/lib/env';
import { useAuth } from '@/features/auth/auth';
import type {
  Cart,
  Nft,
  NftUpdatedEvent,
  Order,
  OrderUpdatedEvent,
  Paginated,
} from '@/types';

interface RealtimeContextValue {
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue>({ isConnected: false });

const seenEvents = new Set<string>();
const seenOrder: string[] = [];
const versions = new Map<string, number>();

function alreadyApplied(eventId: string, resourceKey: string, version: number): boolean {
  if (seenEvents.has(eventId)) return true;
  const last = versions.get(resourceKey) ?? 0;
  if (version <= last) return true;
  seenEvents.add(eventId);
  seenOrder.push(eventId);
  if (seenOrder.length > 500) {
    const evicted = seenOrder.shift();
    if (evicted) seenEvents.delete(evicted);
  }
  versions.set(resourceKey, version);
  return false;
}

function applyNftUpdate(queryClient: QueryClient, evt: NftUpdatedEvent): void {
  const { id, version } = evt.data;
  if (alreadyApplied(evt.eventId, `nft:${id}`, version)) return;

  queryClient.setQueriesData<Nft>({ queryKey: ['nfts', 'detail'] }, (nft) =>
    nft && nft.id === id ? { ...nft, price: evt.data.price, editionsAvailable: evt.data.editionsAvailable, version } : nft,
  );

  queryClient.setQueriesData<Paginated<Nft>>({ queryKey: ['nfts', 'list'] }, (page) => {
    if (!page) return page;
    let touched = false;
    const items = page.items.map((nft) => {
      if (nft.id !== id) return nft;
      touched = true;
      return { ...nft, price: evt.data.price, editionsAvailable: evt.data.editionsAvailable, version };
    });
    return touched ? { ...page, items } : page;
  });

  // reprecifica: força re-quote no checkout
  queryClient.invalidateQueries({ queryKey: ['quote'] });

  // mantém o unitPrice original pra UI sinalizar mudança de preço
  queryClient.setQueriesData<Cart>({ queryKey: ['cart'] }, (cart) => {
    if (!cart) return cart;
    const line = cart.items.find((i) => i.nftId === id);
    if (!line) return cart;
    return {
      ...cart,
      version: cart.version + 1,
      items: cart.items.map((i) =>
        i.nftId === id
          ? { ...i, nft: { ...i.nft, price: evt.data.price, editionsAvailable: evt.data.editionsAvailable, version } }
          : i,
      ),
    };
  });
}

function applyOrderUpdate(queryClient: QueryClient, evt: OrderUpdatedEvent, userId: string | null): void {
  if (!userId || evt.userId !== userId) return; // nunca cruza usuários
  const { id, version } = evt.data;
  if (alreadyApplied(evt.eventId, `order:${id}`, version)) return;

  queryClient.setQueryData<Order>(['orders', userId, id], (order) =>
    order
      ? { ...order, status: evt.data.status, txHash: evt.data.txHash ?? order.txHash, rejectionReason: evt.data.rejectionReason, version }
      : order,
  );
  queryClient.setQueryData<{ items: Order[] }>(['orders', userId], (list) =>
    list
      ? {
          items: list.items.map((o) =>
            o.id === id ? { ...o, status: evt.data.status, txHash: evt.data.txHash ?? o.txHash, rejectionReason: evt.data.rejectionReason, version } : o,
          ),
        }
      : list,
  );
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io(env.socketUrl, {
      path: '/socket.io/',
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 500,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('subscribe', { userId });
      // reconcilia via REST no (re)connect
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['nfts', 'detail'] });
    });
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('nft.updated', (evt: NftUpdatedEvent) => applyNftUpdate(queryClient, evt));

    return () => {
      socket.off();
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.off('order.updated');
    socket.on('order.updated', (evt: OrderUpdatedEvent) => applyOrderUpdate(queryClient, evt, userId));
    if (socket.connected) socket.emit(userId ? 'subscribe' : 'unsubscribe', { userId });
  }, [userId, queryClient]);

  return <RealtimeContext.Provider value={{ isConnected }}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  return useContext(RealtimeContext);
}
