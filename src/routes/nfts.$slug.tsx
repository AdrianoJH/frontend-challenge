import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { ChevronLeft, Heart, Linkedin, Mail, Minus, Plus, Search, ShoppingCart, Star, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/feedback';
import { QuantityStepper } from '@/components/shared/quantity-stepper';
import { RelatedCarousel } from '@/components/nft/related-carousel';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { formatEth } from '@/lib/money';
import { useNft, useNftList } from '@/features/nfts/hooks';
import { useFavorites, useToggleFavorite } from '@/features/favorites/hooks';
import { useAddToCart } from '@/features/cart/hooks';
import { useAuth } from '@/features/auth/auth';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api-error';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/nfts/$slug')({
  component: NftDetailPage,
});

function NftDetailPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const query = useNft(slug);
  const related = useNftList({ page: 1, pageSize: 10 });
  const favorites = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const addToCart = useAddToCart();

  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [tab, setTab] = useState<'detalhes' | 'avaliacoes'>('detalhes');
  const isMobile = useIsMobile();

  if (query.isLoading) return <DetailSkeleton />;

  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.code === 'not_found';
    return (
      <div className="mx-auto w-full max-w-[1440px] px-6 py-16 sm:px-10 lg:px-16">
        {notFound ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-2xl font-bold uppercase tracking-tight">NFT não encontrado</h1>
            <p className="text-muted-foreground">O item que você procura não existe ou foi removido.</p>
            <Button asChild>
              <Link to="/">Voltar ao catálogo</Link>
            </Button>
          </div>
        ) : (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        )}
      </div>
    );
  }

  const nft = query.data!;
  const isFavorite = new Set(favorites.data ?? []).has(nft.id);
  const soldOut = nft.editionsAvailable === 0;
  const gallery = [nft.imageUrl, nft.imageUrl, nft.imageUrl, nft.imageUrl];
  const tokenId = `#${(nft.name.match(/#(\d+)/)?.[1] ?? '0').padStart(4, '0')}`;
  const reviews = 19;
  const rating = 4.8;
  const relatedItems = (related.data?.items ?? []).filter((n) => n.id !== nft.id);
  const chainLabel = nft.chain.charAt(0).toUpperCase() + nft.chain.slice(1);
  const hex = [...nft.id].reduce((a, c) => a + c.charCodeAt(0), 0).toString(16).padStart(8, '0').slice(-8).toUpperCase();
  const contract = `0x${hex.slice(0, 4)}…${hex.slice(-4)}`;
  const reviewList = [
    { name: 'Lia Moretti', stars: 5, text: 'Procedência impecável e arte em altíssima resolução. A transferência caiu na carteira em segundos.' },
    { name: 'Théo Álvarez', stars: 4, text: 'Coleção sólida e atributos bem documentados nos metadados. Recomendo para quem valoriza raridade.' },
    { name: 'Mina Okafor', stars: 5, text: 'Um dos melhores lançamentos da Kurio. Comunidade ativa e criador presente de verdade.' },
  ];

  function onFavorite() {
    if (!isAuthenticated) {
      toast({ title: 'Entre para favoritar', description: 'Favoritos exigem autenticação.' });
      return;
    }
    toggleFavorite.mutate(
      { nftId: nft.id, isFavorite },
      { onError: () => toast({ title: 'Falha ao atualizar favorito', variant: 'error' }) },
    );
  }

  function onAddToCart(thenCheckout: boolean) {
    addToCart.mutate(
      { nftId: nft.id, quantity, additive: true },
      {
        onSuccess: () => {
          toast({ title: 'Adicionado ao carrinho', description: `${quantity}× ${nft.name}`, variant: 'success' });
          if (thenCheckout) navigate({ to: '/cart' });
        },
        onError: (err) =>
          toast({
            title: 'Não foi possível adicionar',
            description: err instanceof ApiError ? err.message : undefined,
            variant: 'error',
          }),
      },
    );
  }

  return isMobile ? (
      <div
        className="fixed inset-0 z-[100] flex flex-col overflow-y-auto"
        style={{ background: 'linear-gradient(143.28deg, #241612 -12%, #2F1D15 106.59%)' }}
      >
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            aria-label="Voltar"
            className="grid size-[35px] place-items-center rounded-full border border-[#3F2319] bg-[#2F1D15] text-[#CFB28C]"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={onFavorite}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
            className="grid size-[35px] place-items-center rounded-full border border-[#3F2319] bg-[#2F1D15] text-[#E89B55]"
          >
            <Heart className={cn('size-5', isFavorite && 'fill-current')} />
          </button>
        </div>

        <div className="px-3 pb-4 pt-3">
          <img src={nft.imageUrl} alt={`Arte do NFT ${nft.name}`} className="aspect-square w-full rounded-2xl object-cover" />
        </div>

        <div className="-mt-12 flex flex-1 flex-col gap-4 rounded-t-[40px] bg-[#241612] px-5 pb-6 pt-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[20px] font-bold leading-tight text-[#F5F1EB]">{nft.name}</h1>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#D28A4C] px-2.5 py-1 text-sm">
              <Star className="size-3.5 fill-current text-[#D28A4C]" />
              <span className="font-bold text-[#F5F1EB]">{rating}</span>
              <span className="text-xs text-muted-foreground">({reviews})</span>
            </span>
          </div>

          <p className="text-[14px] font-normal leading-relaxed text-[#CFB28C]">{nft.description}</p>

          <div className="space-y-1.5">
            <h2 className="text-[15px] font-bold text-[#F5F1EB]">Edição:</h2>
            <div className="flex flex-wrap gap-x-4 text-[15px] font-normal text-[#B39463]">
              {['1/1', '1/10', '1/50', 'ABERTA'].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>

          <dl className="space-y-1.5 text-[15px] font-normal text-[#B39463]">
            <div>
              <dt className="inline">ID do token: </dt>
              <dd className="inline">{tokenId}</dd>
            </div>
            <div>
              <dt className="inline">Coleção: </dt>
              <dd className="inline">{nft.collection}</dd>
            </div>
            <div>
              <dt className="inline">Atributos: </dt>
              <dd className="inline">{nft.attributes.map((a) => a.value).join(', ')}</dd>
            </div>
          </dl>

          <div className="-mx-5 -mb-6 mt-auto space-y-4 rounded-t-[40px] bg-[#241612] px-5 pb-6 pt-4 shadow-[0px_0px_20px_0px_#0A060473]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm">
                <span>Qtd.</span>
                <Button
                  type="button"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Diminuir quantidade"
                  className="h-[30px] w-[20px] rounded-[30px]"
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-6 text-center tabular-nums">{quantity}</span>
                <Button
                  type="button"
                  size="icon"
                  onClick={() => setQuantity(Math.min(nft.editionsAvailable || 1, quantity + 1))}
                  aria-label="Aumentar quantidade"
                  className="h-[30px] w-[20px] rounded-[30px]"
                >
                  <Plus className="size-3" />
                </Button>
              </div>
              <p className="text-xl font-bold text-accent">
                {formatEth(nft.price)} <span className="text-sm">ETH</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => onAddToCart(true)}
                disabled={soldOut || addToCart.isPending}
                className="h-[52px] rounded-full px-8 text-base"
              >
                {soldOut ? 'Esgotado' : 'Comprar NFT'}
              </Button>
              <button
                type="button"
                onClick={() => onAddToCart(false)}
                disabled={soldOut || addToCart.isPending}
                aria-label="Adicionar ao carrinho"
                className="grid size-[60px] shrink-0 place-items-center rounded-full border border-[#3F2319] bg-[#2F1D15] text-[#B39463] disabled:opacity-50"
              >
                <ShoppingCart className="size-6 fill-current" />
              </button>
            </div>
          </div>
        </div>
      </div>
  ) : (
      <div className="mx-auto w-full max-w-[1440px] space-y-12 px-6 py-8 sm:px-10 lg:px-16">
      <nav className="text-sm font-bold text-foreground" aria-label="Trilha">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          Início
        </Link>{' '}
        / <span>Mercado</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col-reverse gap-4 sm:flex-row">
          {gallery.length > 1 && (
            <div
              className="flex gap-3 overflow-x-auto sm:flex-col sm:overflow-visible"
              role="tablist"
              aria-label="Miniaturas"
            >
              {gallery.map((src, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === activeImage}
                  aria-label={`Ver imagem ${i + 1}`}
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    'size-20 shrink-0 overflow-hidden rounded-lg border-2 bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    i === activeImage ? 'border-primary' : 'border-transparent',
                  )}
                >
                  <img src={src} alt="" width={80} height={80} className="size-full" />
                </button>
              ))}
            </div>
          )}
          <div className="relative flex-1 rounded-xl bg-card p-3">
            <button
              type="button"
              aria-label="Ampliar imagem"
              className="absolute right-5 top-5 z-10 grid size-[30px] -translate-y-1/2 translate-x-1/2 place-items-center rounded-[24px] border border-[#3F2319] bg-[#2F1D15] text-foreground"
            >
              <Search className="size-5" />
            </button>
            <div className="aspect-square overflow-hidden rounded-lg">
              <img
                src={gallery[activeImage]}
                alt={`Arte do NFT ${nft.name} (imagem ${activeImage + 1})`}
                width={600}
                height={600}
                className="size-full"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative space-y-3 pb-4 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-bottom after:scale-y-50 after:bg-[#D28A4C] after:content-['']">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{nft.name}</h1>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xl font-bold text-accent">
                {formatEth(nft.price)} <span className="text-base">ETH</span>
              </p>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="flex" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn('size-4 fill-current', i < 4 ? 'text-[#D28A4C]' : 'text-[#CFB28C]')} />
                  ))}
                </span>
                <span>{reviews} avaliações de colecionadores</span>
              </div>
            </div>
          </div>

          <section aria-labelledby="desc-h" className="space-y-2">
            <h2 id="desc-h" className="font-bold">
              Sobre este NFT:
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{nft.description}</p>
          </section>

          <section aria-labelledby="ed-h" className="space-y-3">
            <h2 id="ed-h" className="font-bold">
              Edição:
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {['1/1', '1/10', '1/50', 'ABERTA'].map((label) => {
                const active = label === '1/50';
                return (
                  <span
                    key={label}
                    className={cn(
                      'rounded-[50%] border px-4 py-1.5 text-sm',
                      active ? 'border-primary text-accent' : 'border-border text-muted-foreground',
                    )}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <QuantityStepper value={quantity} max={nft.editionsAvailable || 1} onChange={setQuantity} solid />
            <div className="ml-auto grid grid-cols-2 items-center gap-3">
              {soldOut ? (
                <Button disabled>Esgotado</Button>
              ) : (
                <Button onClick={() => onAddToCart(true)} disabled={addToCart.isPending} className="font-bold uppercase">
                  Comprar
                </Button>
              )}
              <Button variant="outline" onClick={onFavorite} aria-pressed={isFavorite} className="text-accent">
                <Heart className={cn('size-4', isFavorite && 'fill-primary text-primary')} />
                {isFavorite ? 'Nos favoritos' : 'Favoritar'}
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground" aria-live="polite">
            {soldOut ? 'Edição esgotada' : `${nft.editionsAvailable} de ${nft.editionsTotal} disponíveis`}
          </p>

          <dl className="space-y-1.5 text-[15px] font-normal text-[#B39463]">
            <div>
              <dt className="inline">ID do token: </dt>
              <dd className="inline">{tokenId}</dd>
            </div>
            <div>
              <dt className="inline">Coleção: </dt>
              <dd className="inline">{nft.collection}</dd>
            </div>
            <div>
              <dt className="inline">Atributos: </dt>
              <dd className="inline">{nft.attributes.map((a) => a.value).join(', ')}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-bold">Compartilhar este NFT:</span>
            <div className="flex items-center gap-3 text-[#F5F1EB]">
              <a href="#" onClick={(e) => e.preventDefault()} aria-label="Compartilhar no LinkedIn" className="hover:opacity-80">
                <Linkedin className="size-4 fill-current" />
              </a>
              <a href="#" onClick={(e) => e.preventDefault()} aria-label="Compartilhar por e-mail" className="hover:opacity-80">
                <Mail className="size-4" />
              </a>
              <a href="#" onClick={(e) => e.preventDefault()} aria-label="Compartilhar no Twitter" className="hover:opacity-80">
                <Twitter className="size-4 fill-current" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-6 pt-2">
        <div className="relative flex gap-6 text-sm after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-bottom after:scale-y-50 after:bg-[#D28A4C] after:content-['']">
          <button
            type="button"
            onClick={() => setTab('detalhes')}
            className={cn('-mb-px border-b-2 pb-3', tab === 'detalhes' ? 'border-[#D28A4C] font-bold text-accent' : 'border-transparent text-foreground hover:text-primary')}
          >
            Detalhes do NFT
          </button>
          <button
            type="button"
            onClick={() => setTab('avaliacoes')}
            className={cn('-mb-px border-b-2 pb-3', tab === 'avaliacoes' ? 'border-[#D28A4C] font-bold text-accent' : 'border-transparent text-foreground hover:text-primary')}
          >
            Avaliações de colecionadores ({reviews})
          </button>
        </div>

        {tab === 'detalhes' ? (
          <div className="space-y-4 text-[14px] font-normal leading-relaxed text-[#CFB28C]">
            <p>
              {nft.name} é uma obra digital 1/50 finalizada à mão da coleção {nft.collection}. Cada atributo fica armazenado nos metadados do token e
              verificado na {chainLabel}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.
            </p>
            <p>
              A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na
              rede. {nft.creator.name} recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.
            </p>
            <div>
              <p className="text-[14px] font-bold text-[#F5F1EB]">Rede:</p>
              <p>Cunhado na {chainLabel} com procedência imutável e metadados armazenados no IPFS.</p>
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#F5F1EB]">Contrato:</p>
              <p>Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</p>
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#F5F1EB]">Direitos autorais:</p>
              <p>{contract} · Contrato inteligente ERC-721 verificado.</p>
            </div>
          </div>
        ) : (
          <ul className="space-y-6">
            {reviewList.map((r) => (
              <li key={r.name} className="space-y-1.5">
                <span className="flex" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn('size-4 fill-current', i < r.stars ? 'text-[#D28A4C]' : 'text-[#CFB28C]')} />
                  ))}
                </span>
                <p className="text-[14px] font-bold text-[#F5F1EB]">{r.name}</p>
                <p className="text-[14px] font-normal leading-relaxed text-[#CFB28C]">{r.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <RelatedCarousel title="Mais desta coleção" items={relatedItems} uppercaseTitle />
      </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-8 sm:px-10 lg:px-16">
      <Skeleton className="mb-8 h-4 w-32" />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col-reverse gap-4 sm:flex-row">
          <div className="flex gap-3 sm:flex-col">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="size-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="aspect-square flex-1 rounded-xl" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-48 rounded-full" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
