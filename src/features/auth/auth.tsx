import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api';
import { queryKeys } from '@/lib/query-keys';
import { getToken, onUnauthorized, setToken } from '@/lib/auth-token';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  userId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const hasToken = Boolean(getToken());

  const sessionQuery = useQuery({
    queryKey: queryKeys.session,
    queryFn: ({ signal }) => authApi.session(signal),
    enabled: hasToken,
    retry: false,
    staleTime: 5 * 60_000,
  });

  const previousUserId = useRef<string | null>(sessionQuery.data?.user.id ?? null);

  useEffect(() => {
    const unregister = onUnauthorized(() => {
      setToken(null);
      queryClient.setQueryData(queryKeys.session, null);
      clearPrivateData(queryClient);
    });
    return unregister;
  }, [queryClient]);

  const currentUserId = sessionQuery.data?.user.id ?? null;
  useEffect(() => {
    if (previousUserId.current && previousUserId.current !== currentUserId) {
      clearPrivateData(queryClient, previousUserId.current);
    }
    previousUserId.current = currentUserId;
  }, [currentUserId, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: sessionQuery.data?.user ?? null,
      userId: currentUserId,
      isLoading: hasToken && sessionQuery.isLoading,
      isAuthenticated: Boolean(currentUserId),
    }),
    [sessionQuery.data, sessionQuery.isLoading, hasToken, currentUserId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function clearPrivateData(
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: string,
): void {
  const privateRoots = ['favorites', 'cart', 'wallets', 'profile', 'orders'];
  queryClient.removeQueries({
    predicate: (query) => {
      const [root, scopedId] = query.queryKey as [string, string?];
      if (!privateRoots.includes(root)) return false;
      return userId ? scopedId === userId : true;
    },
  });
}
