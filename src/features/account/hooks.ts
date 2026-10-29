import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi, walletApi } from '@/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/features/auth/auth';
import type { PasswordChangeInput, ProfileInput, Wallet, WalletInput } from '@/types';

export function useProfile() {
  const { userId, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.profile(userId ?? 'anon'),
    queryFn: ({ signal }) => profileApi.get(signal),
    enabled: isAuthenticated,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    mutationFn: (input: ProfileInput) => profileApi.update(input),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.profile(userId ?? 'anon'), user);
      queryClient.invalidateQueries({ queryKey: queryKeys.session });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: PasswordChangeInput) => profileApi.changePassword(input),
  });
}

export function useWallets() {
  const { userId, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.wallets(userId ?? 'anon'),
    queryFn: ({ signal }) => walletApi.list(signal),
    enabled: isAuthenticated,
  });
}

export function useAddWallet() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    mutationFn: (input: WalletInput) => walletApi.add(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.wallets(userId ?? 'anon') }),
  });
}

export function useUpdateWallet() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<WalletInput> }) => walletApi.update(id, input),
    onSuccess: (wallet: Wallet) => {
      queryClient.setQueryData<Wallet[]>(queryKeys.wallets(userId ?? 'anon'), (list) =>
        list ? list.map((w) => (w.id === wallet.id ? wallet : w)) : list,
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets(userId ?? 'anon') });
    },
  });
}
