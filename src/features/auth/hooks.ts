import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api';
import { queryKeys } from '@/lib/query-keys';
import { setToken } from '@/lib/auth-token';
import { clearPrivateData } from './auth';
import type { Credentials, RegisterInput, Session } from '@/types';

function adoptSession(queryClient: ReturnType<typeof useQueryClient>, session: Session): void {
  setToken(session.token);
  queryClient.setQueryData(queryKeys.session, session);
  queryClient.invalidateQueries({ queryKey: ['cart'] });
  queryClient.invalidateQueries({ queryKey: ['favorites'] });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Credentials) => authApi.login(input),
    onSuccess: (session) => adoptSession(queryClient, session),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (session) => adoptSession(queryClient, session),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      setToken(null);
      queryClient.setQueryData(queryKeys.session, null);
      clearPrivateData(queryClient);
    },
  });
}
