import { Link } from '@tanstack/react-router';
import { Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatEth } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { Nft } from '@/types';

const CARD_BOX = 'px-[3.5px] py-4 lg:px-1 lg:pb-[26px] lg:pt-6';

export function NftCard({
  nft,
  isFavorite,
  onToggleFavorite,
  canFavorite,
}: {
  nft: Nft;
  isFavorite: boolean;
  onToggleFavorite?: (nft: Nft) => void;
  canFavorite: boolean;
}) {
  const soldOut = nft.editionsAvailable === 0;
  const isRare = nft.attributes?.some((a) => a.trait.toLowerCase() === 'raridade' && (a.value === 'Épico' || a.value === 'Lendário'));

  return (
    <div className="group flex w-full flex-col lg:w-fit">
      <div className={cn('relative w-full rounded-xl bg-card lg:w-fit', CARD_BOX)}>
        {canFavorite && (
          <button
            type="button"
            onClick={() => onToggleFavorite?.(nft)}
            className={cn(
              'absolute right-2.5 top-2.5 z-10 grid size-8 place-items-center rounded-full bg-background/70 opacity-100 backdrop-blur transition-opacity hover:bg-background focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:right-4 lg:top-9 lg:size-9 lg:opacity-0 lg:group-hover:opacity-100',
              isFavorite && 'opacity-100',
            )}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Adicionar ${nft.name} aos favoritos`}
          >
            <Heart className={cn('size-4', isFavorite ? 'fill-primary text-primary' : 'text-foreground')} />
          </button>
        )}
        <Link
          to="/nfts/$slug"
          params={{ slug: nft.slug }}
          className="relative block aspect-square w-full overflow-hidden rounded-lg bg-muted focus-visible:outline-none lg:aspect-auto lg:h-[300px] lg:w-[258px]"
        >
          {isRare && (
            <Badge variant="rare" className="absolute left-0 top-0 z-10 rounded-none rounded-br-lg rounded-tl-lg py-1 text-xs font-bold">
              RARO
            </Badge>
          )}
          <img
            src={nft.imageUrl}
            alt={`Arte do NFT ${nft.name}`}
            loading="lazy"
            width={258}
            height={300}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          {soldOut && (
            <span className="absolute inset-0 grid place-items-center bg-background/60">
              <Badge variant="destructive">Esgotado</Badge>
            </span>
          )}
        </Link>
      </div>

      <div className="mt-3 flex w-full flex-col gap-1 pl-1 lg:w-[258px]">
        <Link to="/nfts/$slug" params={{ slug: nft.slug }} className="truncate text-[15px] hover:text-primary lg:text-base" title={nft.name}>
          {nft.name}
        </Link>
        <p className="text-[16px] font-bold text-primary lg:text-lg">
          {formatEth(nft.price)} <span className="text-xs">ETH</span>
        </p>
      </div>
    </div>
  );
}

export function NftCardSkeleton() {
  return (
    <div className="flex w-full flex-col lg:w-fit">
      <div className={cn('w-full rounded-xl bg-card lg:w-fit', CARD_BOX)}>
        <Skeleton className="aspect-square w-full rounded-lg lg:aspect-auto lg:h-[300px] lg:w-[258px]" />
      </div>
      <div className="mt-3 w-full space-y-2 pl-1 lg:w-[258px]">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
      </div>
    </div>
  );
}
