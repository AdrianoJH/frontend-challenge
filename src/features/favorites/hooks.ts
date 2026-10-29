import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { favoriteApi } from '@/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/features/auth/auth';

export function useFavorites() {
  const { userId, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.favorites(userId ?? 'anon'),
    queryFn: ({ signal }) => favoriteApi.list(signal),
    enabled: isAuthenticated,
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const key = queryKeys.favorites(userId ?? 'anon');

  return useMutation({
    mutationFn: ({ nftId, isFavorite }: { nftId: string; isFavorite: boolean }) =>
      isFavorite ? favoriteApi.remove(nftId) : favoriteApi.add(nftId),

    onMutate: async ({ nftId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<string[]>(key) ?? [];
      const next = isFavorite ? previous.filter((id) => id !== nftId) : [...previous, nftId];
      queryClient.setQueryData<string[]>(key, next);
      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context) queryClient.setQueryData(key, context.previous);
    },

    onSuccess: (nftIds) => {
      queryClient.setQueryData(key, nftIds);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
