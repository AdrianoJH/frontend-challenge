import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderApi, quoteApi } from '@/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/features/auth/auth';
import type { CreateOrderInput, Order, Quote, QuoteInput } from '@/types';

export function useQuote(input: QuoteInput | null) {
  return useQuery({
    queryKey: ['quote', input],
    queryFn: ({ signal }) => quoteApi.create(input!, signal),
    enabled: Boolean(input && input.items.length > 0),
    staleTime: 0,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreateOrderInput; idempotencyKey: string }) =>
      orderApi.create(input, idempotencyKey),
    onSuccess: (order) => {
      if (!userId) return;
      queryClient.setQueryData(queryKeys.orders.detail(userId, order.id), order);
      queryClient.invalidateQueries({ queryKey: queryKeys.cart(userId) });
    },
  });
}

export function useOrder(orderId: string | undefined) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: queryKeys.orders.detail(userId ?? 'anon', orderId ?? ''),
    queryFn: ({ signal }) => orderApi.get(orderId!, signal),
    enabled: Boolean(orderId && userId),
    refetchInterval: (query) => {
      const order = query.state.data as Order | undefined;
      return order && order.status === 'pending' ? 2000 : false;
    },
  });
}

export function buildQuoteInput(
  chain: Quote['chain'],
  items: Array<{ nftId: string; quantity: number; expectedUnitPrice?: string }>,
  couponCode?: string,
): QuoteInput {
  return { chain, items, couponCode: couponCode || undefined };
}
