import { useId, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { formatEth } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { Nft } from '@/types';

export function RelatedCarousel({
  title,
  items,
  rounded = false,
  uppercaseTitle = false,
}: {
  title: string;
  items: Nft[];
  rounded?: boolean;
  uppercaseTitle?: boolean;
}) {
  const headingId = useId();
  const [page, setPage] = useState(0);

  if (!items.length) return null;

  // dá a volta no array quando faltam itens, pra sempre fechar 5 por página
  const pick = (start: number) => Array.from({ length: 5 }, (_, i) => items[(start + i) % items.length]);
  const pages = [pick(0), pick(5), pick(10)];

  return (
    <section aria-labelledby={headingId} className="space-y-6">
      <div>
        <h2 id={headingId} className={cn('mb-3 font-bold tracking-tight text-[#E89B55]', uppercaseTitle && 'uppercase')}>
          {title}
        </h2>
        <div className="h-px origin-top scale-y-50 bg-[#D28A4C]" />
      </div>

      <div className="overflow-hidden">
        <div className="flex transition-transform duration-300 ease-out" style={{ transform: `translateX(-${page * 100}%)` }}>
          {pages.map((group, pi) => (
            <div key={pi} className="flex w-full shrink-0">
              {group.map((n, ci) => (
                <div key={`${pi}-${ci}`} className="w-1/5 shrink-0 px-2">
                  <Link to="/nfts/$slug" params={{ slug: n.slug }} className="group block">
                    <div className={cn('bg-card', rounded && 'rounded-xl')} style={{ padding: '20px 4px 23px 4px' }}>
                      <div className={cn('aspect-[220/255] overflow-hidden bg-muted', rounded && 'rounded-lg')}>
                        <img
                          src={n.imageUrl}
                          alt={n.name}
                          loading="lazy"
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                    </div>
                    <div className="mt-3 pl-1">
                      <p className="truncate text-base group-hover:text-primary" title={n.name}>
                        {n.name}
                      </p>
                      <p className="text-lg font-bold text-primary">
                        {formatEth(n.price)} <span className="text-xs">ETH</span>
                      </p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-2" role="tablist" aria-label="Páginas">
        {pages.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === page}
            aria-label={`Página ${i + 1}`}
            onClick={() => setPage(i)}
            className={cn('size-2.5 rounded-full border border-[#D28A4C] transition-colors', i === page ? 'bg-[#D28A4C]' : 'bg-transparent hover:bg-[#D28A4C]/40')}
          />
        ))}
      </div>
    </section>
  );
}
