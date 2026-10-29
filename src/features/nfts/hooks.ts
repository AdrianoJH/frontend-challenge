import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { nftApi } from '@/api';
import { queryKeys } from '@/lib/query-keys';
import type { NftListParams } from '@/types';

export function useNftList(params: NftListParams) {
  return useQuery({
    queryKey: queryKeys.nfts.list(params),
    queryFn: ({ signal }) => nftApi.list(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useFeaturedNfts() {
  return useQuery({
    queryKey: queryKeys.nfts.featured(),
    queryFn: ({ signal }) => nftApi.featured(signal),
    staleTime: 60_000,
  });
}

export function useNft(idOrSlug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.nfts.detail(idOrSlug ?? ''),
    queryFn: ({ signal }) => nftApi.detail(idOrSlug!, signal),
    enabled: Boolean(idOrSlug),
  });
}
