import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/features/auth/auth';
import type { Cart } from '@/types';

export function useCart() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: queryKeys.cart(userId ?? 'visitor'),
    queryFn: ({ signal }) => cartApi.get(signal),
  });
}

function useCartKey() {
  const { userId } = useAuth();
  return queryKeys.cart(userId ?? 'visitor');
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  const key = useCartKey();
  return useMutation({
    mutationFn: ({ nftId, quantity, additive = true }: { nftId: string; quantity: number; additive?: boolean }) =>
      cartApi.addItem(nftId, quantity, additive),
    onSuccess: (cart) => queryClient.setQueryData(key, cart),
  });
}

export function useSetCartQuantity() {
  const queryClient = useQueryClient();
  const key = useCartKey();
  return useMutation({
    mutationFn: ({ nftId, quantity }: { nftId: string; quantity: number }) => cartApi.setQuantity(nftId, quantity),
    onMutate: async ({ nftId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Cart>(key);
      if (previous) {
        queryClient.setQueryData<Cart>(key, {
          ...previous,
          items: previous.items.map((i) => (i.nftId === nftId ? { ...i, quantity } : i)),
        });
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && queryClient.setQueryData(key, ctx.previous),
    onSuccess: (cart) => queryClient.setQueryData(key, cart),
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();
  const key = useCartKey();
  return useMutation({
    mutationFn: (nftId: string) => cartApi.removeItem(nftId),
    onSuccess: (cart) => queryClient.setQueryData(key, cart),
  });
}
