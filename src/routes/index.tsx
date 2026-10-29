import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Search, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { NftCard, NftCardSkeleton } from '@/components/nft/nft-card';
import { EmptyState, ErrorState } from '@/components/shared/feedback';
import { useNftList } from '@/features/nfts/hooks';
import { useFavorites, useToggleFavorite } from '@/features/favorites/hooks';
import { useAuth } from '@/features/auth/auth';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import type { ChainId, Nft, NftCategory, NftSort } from '@/types';

interface CatalogSearch {
  q?: string;
  categories?: NftCategory[];
  chains?: ChainId[];
  minPrice?: string;
  maxPrice?: string;
  sort?: NftSort;
  page?: number;
  availableOnly?: boolean;
}

const COLLECTIONS: Array<{ value: NftCategory; label: string; count: number }> = [
  { value: 'art', label: 'Arte digital', count: 33 },
  { value: 'photography', label: 'Fotografia', count: 12 },
  { value: 'music', label: 'Música', count: 65 },
  { value: '3d', label: 'Arte 3D', count: 39 },
  { value: 'collectible', label: 'Colecionáveis', count: 23 },
  { value: 'generative', label: 'Generativa', count: 17 },
  { value: 'gaming', label: 'Jogos', count: 19 },
  { value: 'subscription', label: 'Assinaturas', count: 13 },
  { value: 'utility', label: 'Utilidade', count: 18 },
];
const NETWORKS: Array<{ value: ChainId; label: string; count: number }> = [
  { value: 'ethereum', label: 'Ethereum', count: 119 },
  { value: 'polygon', label: 'Polygon', count: 78 },
  { value: 'solana', label: 'Solana', count: 86 },
];
const ALL_CATEGORIES: NftCategory[] = COLLECTIONS.map((c) => c.value);
const ALL_CHAINS: ChainId[] = NETWORKS.map((n) => n.value);
const PRICE_MIN = 0.02;
const PRICE_MAX = 12.3;
const SORTS: Array<{ value: NftSort; label: string }> = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'popular', label: 'Mais populares' },
];
const PAGE_SIZE = 12;

const HERO_SLIDES = [
  {
    eyebrow: 'Bem-vindo à Kurio',
    title: 'Seja dono do futuro da arte digital',
    description:
      'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e torne-se parte da cultura de internet.',
    image: '/images/ape-emerald.png',
  },
  {
    eyebrow: 'Coleções em destaque',
    title: 'Edições limitadas direto dos criadores',
    description:
      'Acompanhe lançamentos gênesis, drops exclusivos e obras verificadas antes de todo mundo, com procedência registrada na rede.',
    image: '/images/ape-baron.png',
  },
  {
    eyebrow: 'Comunidade Kurio',
    title: 'Colecione, negocie e faça parte',
    description:
      'Conecte sua carteira, monte sua coleção e participe de uma cultura digital que valoriza os criadores e a propriedade real.',
    image: '/images/ape-nomad.png',
  },
];

const MOBILE_HERO = [
  {
    eyebrow: 'Bem-vindo à Kurio',
    title: 'Seja dono da cultura digital',
    description: 'Descubra NFTs selecionados de criadores do mundo todo.',
    image: '/images/ape-emerald.png',
  },
  {
    eyebrow: 'Coleções em destaque',
    title: 'Edições limitadas',
    description: 'Drops exclusivos antes de todo mundo.',
    image: '/images/ape-baron.png',
  },
  {
    eyebrow: 'Comunidade Kurio',
    title: 'Colecione e faça parte',
    description: 'Monte sua coleção e participe.',
    image: '/images/ape-nomad.png',
  },
];

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): CatalogSearch => {
    const categories = toStringArray(search.categories).filter((c): c is NftCategory => ALL_CATEGORIES.includes(c as NftCategory));
    const chains = toStringArray(search.chains).filter((c): c is ChainId => ALL_CHAINS.includes(c as ChainId));
    return {
      q: typeof search.q === 'string' && search.q ? search.q : undefined,
      // array vazio vira undefined pra não deixar ?categories=[] na URL
      categories: categories.length ? categories : undefined,
      chains: chains.length ? chains : undefined,
      minPrice: typeof search.minPrice === 'string' ? search.minPrice : undefined,
      maxPrice: typeof search.maxPrice === 'string' ? search.maxPrice : undefined,
      sort: SORTS.some((s) => s.value === search.sort) ? (search.sort as NftSort) : undefined,
      page: Number(search.page) > 1 ? Number(search.page) : undefined,
      availableOnly: search.availableOnly === true || search.availableOnly === 'true' ? true : undefined,
    };
  },
  component: CatalogPage,
});

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value) return value.split(',');
  return [];
}

function toggleIn<T extends string>(list: T[] | undefined, value: T): T[] | undefined {
  const set = new Set(list ?? []);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return set.size ? [...set] : undefined;
}

type PatchFn = (next: Partial<CatalogSearch>, resetPage?: boolean) => void;

function CatalogFilters({ search, patch }: { search: CatalogSearch; patch: PatchFn }) {
  return (
    <div>
      <h2 className="mb-4 font-bold">Coleções</h2>
      <ul className="space-y-3 text-sm">
        {COLLECTIONS.map((c) => {
          const active = search.categories?.includes(c.value) ?? false;
          return (
            <li key={c.value}>
              <button
                onClick={() => patch({ categories: toggleIn(search.categories, c.value) })}
                aria-pressed={active}
                className={cn(
                  'flex w-full items-center justify-between gap-2 transition-colors hover:text-primary',
                  active ? 'font-semibold text-primary' : 'text-muted-foreground',
                )}
              >
                <span>{c.label}</span>
                <span className="tabular-nums">({c.count})</span>
              </button>
            </li>
          );
        })}
      </ul>

      <h2 className="mb-4 mt-8 font-bold">Faixa de preço</h2>
      <PriceFilter min={search.minPrice} max={search.maxPrice} onApply={(lo, hi) => patch({ minPrice: lo, maxPrice: hi })} />

      <h2 className="mb-4 mt-8 font-bold">Rede</h2>
      <ul className="space-y-3 text-sm">
        {NETWORKS.map((n) => {
          const active = search.chains?.includes(n.value) ?? false;
          return (
            <li key={n.value}>
              <button
                onClick={() => patch({ chains: toggleIn(search.chains, n.value) })}
                aria-pressed={active}
                className={cn(
                  'flex w-full items-center justify-between gap-2 transition-colors hover:text-primary',
                  active ? 'font-semibold text-primary' : 'text-muted-foreground',
                )}
              >
                <span>{n.label}</span>
                <span className="tabular-nums">({n.count})</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CatalogPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const params = { ...search, page: search.page ?? 1, pageSize: PAGE_SIZE };
  const query = useNftList(params);
  const favorites = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const favoriteIds = new Set(favorites.data ?? []);

  const patch = useCallback(
    (next: Partial<CatalogSearch>, resetPage = true) => {
      navigate({
        search: (prev) => {
          const merged: CatalogSearch = { ...prev, ...next };
          if (resetPage) merged.page = undefined;
          return merged;
        },
      });
    },
    [navigate],
  );

  function onToggleFavorite(nft: Nft) {
    if (!isAuthenticated) {
      toast({ title: 'Entre para favoritar', description: 'Favoritos exigem autenticação.' });
      return;
    }
    toggleFavorite.mutate(
      { nftId: nft.id, isFavorite: favoriteIds.has(nft.id) },
      { onError: () => toast({ title: 'Falha ao atualizar favorito', variant: 'error' }) },
    );
  }

  const data = query.data;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = params.page;
  const activeTab: 'todos' | 'novos' | 'alta' = search.sort === 'popular' ? 'alta' : search.sort === 'recent' ? 'novos' : 'todos';

  return (
    <div>
      <MobileTop search={search} patch={patch} />

      <div className="hidden lg:block">
        <Hero />
      </div>

      <div id="catalogo" className="mx-auto w-full max-w-[1440px] px-6 py-10 sm:px-10 lg:px-16">
        <div className="grid gap-8 lg:grid-cols-[368px_1fr]">
          <aside className="hidden space-y-6 lg:block" aria-label="Filtros">
            <div className="bg-card p-5">
              <CatalogFilters search={search} patch={patch} />
            </div>

            <div className="w-[310px] max-w-full" style={{ background: 'linear-gradient(180deg, rgba(210, 138, 76, 0.1) 0%, rgba(210, 138, 76, 0.03) 100%)' }}>
              <div className="p-4">
                <p className="text-[24px] font-bold uppercase leading-tight text-primary">NFT em destaque</p>
                <p className="text-[22px] font-bold uppercase leading-tight text-foreground">Oferta limitada</p>
              </div>
              <img
                src="/images/ape-nomad.png"
                alt="NFT em destaque: oferta limitada"
                width={310}
                height={368}
                className="aspect-[310/368] w-full rounded-b-lg"
              />
            </div>
          </aside>

          <section aria-label="Resultados" aria-busy={query.isFetching}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-5 overflow-x-auto text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <Tab active={activeTab === 'todos'} onClick={() => patch({ sort: undefined })}>
                  Todos os NFTs
                </Tab>
                <Tab active={activeTab === 'novos'} onClick={() => patch({ sort: 'recent' })}>
                  Novos lançamentos
                </Tab>
                <Tab active={activeTab === 'alta'} onClick={() => patch({ sort: 'popular' })}>
                  Em alta
                </Tab>
              </div>
              <div className="hidden items-center gap-1.5 lg:flex">
                <Label htmlFor="sort" className="text-sm text-foreground">
                  Ordenar por:
                </Label>
                <Select value={search.sort ?? 'recent'} onValueChange={(v) => patch({ sort: v as NftSort })}>
                  <SelectTrigger id="sort" className="h-auto w-auto gap-1 border-0 bg-transparent px-0 text-sm text-foreground focus:ring-0 focus:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="sr-only" aria-live="polite">
              {query.isLoading ? 'Carregando…' : `${data?.total ?? 0} resultado(s)`}
              {search.q && ` para “${search.q}”`}
            </p>

            {query.isError ? (
              <ErrorState error={query.error} onRetry={() => query.refetch()} />
            ) : query.isLoading ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 pb-10 [&>*:nth-child(even)]:translate-y-10 lg:flex lg:flex-wrap lg:gap-x-6 lg:gap-y-8 lg:pb-0 lg:[&>*:nth-child(even)]:translate-y-0">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <NftCardSkeleton key={i} />
                ))}
              </div>
            ) : data && data.items.length === 0 ? (
              <EmptyState
                title="Nenhum NFT encontrado"
                description="Ajuste a busca ou os filtros para ver outros resultados."
                action={
                  <Button variant="outline" onClick={() => navigate({ search: {} })}>
                    Limpar filtros
                  </Button>
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 pb-10 [&>*:nth-child(even)]:translate-y-10 lg:flex lg:flex-wrap lg:gap-x-6 lg:gap-y-8 lg:pb-0 lg:[&>*:nth-child(even)]:translate-y-0">
                  {data?.items.map((nft) => (
                    <NftCard key={nft.id} nft={nft} isFavorite={favoriteIds.has(nft.id)} canFavorite onToggleFavorite={onToggleFavorite} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav className="mt-8 flex items-center justify-end gap-2" aria-label="Paginação">
                    {currentPage > 1 && (
                      <PageBtn onClick={() => patch({ page: currentPage - 1 > 1 ? currentPage - 1 : undefined }, false)} label="Página anterior">
                        <ChevronLeft className="size-4" />
                      </PageBtn>
                    )}
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const p = i + 1;
                      return (
                        <PageBtn key={p} active={p === currentPage} onClick={() => patch({ page: p > 1 ? p : undefined }, false)}>
                          {p}
                        </PageBtn>
                      );
                    })}
                    {currentPage < totalPages && (
                      <PageBtn onClick={() => patch({ page: currentPage + 1 }, false)} label="Próxima página">
                        <ChevronRight className="size-4" />
                      </PageBtn>
                    )}
                  </nav>
                )}
              </>
            )}
          </section>
        </div>

        <FeatureBanners />
        <Journal />
      </div>
    </div>
  );
}

function MobileTop({
  search,
  patch,
}: {
  search: CatalogSearch;
  patch: (next: Partial<CatalogSearch>, resetPage?: boolean) => void;
}) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % MOBILE_HERO.length), 6000);
    return () => clearInterval(id);
  }, []);

  const current = MOBILE_HERO[slide];

  return (
    <div className="px-4 pb-2 pt-6 lg:hidden">
      <div className="flex items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const q = new FormData(e.currentTarget).get('q')?.toString() ?? '';
            patch({ q: q || undefined });
          }}
          className="relative flex-1"
          role="search"
        >
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#B39463]" />
          <input
            name="q"
            defaultValue={search.q ?? ''}
            placeholder="Explorar coleções"
            aria-label="Explorar coleções"
            className="h-11 w-full rounded-[10px] bg-[#241612] pl-11 pr-4 text-sm font-bold text-[#B39463] outline-none placeholder:font-bold placeholder:text-[#B39463]"
          />
        </form>
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="Filtros"
              className="grid size-11 shrink-0 place-items-center rounded-[10px] text-primary-foreground"
              style={{ background: 'linear-gradient(137.05deg, rgba(210, 138, 76, 0.45) -24.6%, #D28A4C 100%)' }}
            >
              <Settings2 className="size-5" />
            </button>
          </DialogTrigger>
          <DialogContent className="left-0 top-0 h-full max-h-none w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none border-0">
            <DialogHeader>
              <DialogTitle>Filtros</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="sort-mobile">Ordenar por</Label>
              <Select value={search.sort ?? 'recent'} onValueChange={(v) => patch({ sort: v as NftSort })}>
                <SelectTrigger id="sort-mobile">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CatalogFilters search={search} patch={patch} />
          </DialogContent>
        </Dialog>
      </div>

      {/* recorte (overflow+rounded) fica no wrapper; a animação precisa ir no filho pra não ser cortada */}
      <div
        className="relative mt-4 min-h-[190px] overflow-hidden rounded-[30px]"
        style={{ background: 'url(/images/hero-mobile-bg.svg) center / 100% 100% no-repeat, #140D0A' }}
      >
        <div key={slide} className="px-4 pb-4 pt-5 duration-500 animate-in fade-in">
          <div className="grid grid-cols-[1fr_138px] items-start gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-[#F7F3EC]">{current.eyebrow}</p>
              <h2 className="mt-1 line-clamp-2 text-[18px] font-bold uppercase leading-[1.15] text-[#F5F1EB]">{current.title}</h2>
              <p className="mt-2 line-clamp-2 text-[12px] font-normal leading-relaxed text-[#CFB28C]">{current.description}</p>
              <a href="#catalogo" className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold uppercase text-[#CFB28C]">
                Explorar <ArrowRight className="size-3.5" />
              </a>
            </div>
            <img
              src={current.image}
              alt="NFT em destaque da coleção Kurio"
              width={138}
              height={138}
              className="size-[138px] shrink-0 rounded-xl object-cover"
            />
          </div>

          <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="Destaques">
            {MOBILE_HERO.map((s, i) => (
              <button
                key={s.title}
                role="tab"
                aria-selected={i === slide}
                aria-label={`Ir para o slide ${i + 1}`}
                onClick={() => setSlide(i)}
                className={cn('size-1.5 rounded-full transition-colors', i === slide ? 'bg-primary' : 'bg-muted-foreground/40')}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(id);
  }, []);

  const current = HERO_SLIDES[slide];

  return (
    <section className="relative overflow-hidden">
      <div
        key={slide}
        className="mx-auto grid w-full max-w-[1440px] items-center gap-8 px-6 py-12 duration-500 animate-in fade-in slide-in-from-right-8 sm:px-10 md:grid-cols-2 md:py-16 lg:px-16"
      >
        <div>
          <p className="mb-4 text-sm text-foreground">{current.eyebrow}</p>
          <h1 className="text-[2rem] font-bold uppercase leading-[1.5] text-foreground sm:text-[2.7rem]">{current.title}</h1>
          <p className="mt-5 max-w-md text-sm font-normal leading-relaxed text-muted-foreground">{current.description}</p>
          <Button asChild className="mt-7 gap-2 font-bold uppercase">
            <a href="#catalogo">
              Explorar <ArrowRight className="size-4" />
            </a>
          </Button>
        </div>
        <div className="flex justify-center md:justify-end">
          <img
            src={current.image}
            alt="NFT em destaque da coleção Kurio"
            width={420}
            height={420}
            className="w-full max-w-sm rounded-2xl border border-border"
          />
        </div>
      </div>

      <div
        className="absolute bottom-10 left-1/2 flex -translate-x-1/2 gap-2.5 md:bottom-16 md:left-[46%]"
        role="tablist"
        aria-label="Destaques"
      >
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.title}
            role="tab"
            aria-selected={i === slide}
            aria-label={`Ir para o slide ${i + 1}`}
            onClick={() => setSlide(i)}
            className={cn(
              'size-2.5 rounded-full transition-colors',
              i === slide ? 'bg-primary' : 'bg-muted-foreground/40 hover:bg-muted-foreground',
            )}
          />
        ))}
      </div>
    </section>
  );
}

function FeatureBanners() {
  const banners = [
    { img: '/images/ape-emerald.png', title: 'Lançamentos gênesis de edição limitada', text: 'Colecione edições escassas diretamente de criadores antes da revelação pública.' },
    { img: '/images/ape-baron.png', title: 'Arte digital selecionada e muito mais', text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.' },
  ];
  return (
    <div className="mt-12 grid gap-[28px] md:grid-cols-2">
      {banners.map((b) => (
        <div key={b.title} className="flex min-h-[150px] gap-3 rounded-xl bg-card pr-4 sm:h-[250px] sm:items-center sm:gap-6 sm:pr-6">
          <img src={b.img} alt="" width={250} height={250} className="w-[130px] shrink-0 self-stretch rounded-l-xl object-cover sm:size-[250px] sm:self-center sm:object-fill" />
          <div className="flex min-w-0 flex-1 flex-col items-end justify-center py-3 text-right">
            <h3 className="text-sm font-bold leading-snug sm:text-lg">{b.title}</h3>
            <p className="mt-1.5 line-clamp-2 max-w-full text-[11px] text-muted-foreground sm:mt-2 sm:line-clamp-none sm:max-w-[18rem] sm:text-sm">{b.text}</p>
            <Button asChild className="mt-2.5 gap-1 sm:mt-4">
              <a href="#catalogo">
                Explorar <ArrowRight className="size-3.5" />
              </a>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Journal() {
  const posts = [
    {
      img: '/images/ape-baron.png',
      date: '12 de setembro',
      read: 'Leitura de 6 min',
      title: 'Como funciona a propriedade de NFTs',
      excerpt: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    },
    {
      img: '/images/ape-emerald.png',
      date: '13 de setembro',
      read: 'Leitura de 2 min',
      title: '10 artistas digitais para acompanhar',
      excerpt: 'Conheça criadores que moldam a cultura digital.',
    },
    {
      img: '/images/ape-nomad.png',
      date: '15 de setembro',
      read: 'Leitura de 3 min',
      title: 'Raridade, atributos e procedência',
      excerpt: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    },
    {
      img: '/images/ape-beat.png',
      date: '15 de setembro',
      read: 'Leitura de 2 min',
      title: 'Como proteger sua carteira',
      excerpt: 'Proteja sua carteira, seus ativos e sua identidade.',
    },
  ];
  return (
    <section className="mt-16" aria-labelledby="journal-h">
      <h2 id="journal-h" className="mb-1 text-center text-2xl font-bold">
        Diário da Cunhagem
      </h2>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
      </p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {posts.map((p) => (
          <article key={p.title} className="w-full overflow-hidden rounded-xl bg-card">
            <img src={p.img} alt="" width={268} height={195} className="aspect-[268/195] w-full object-cover" />
            <div className="flex h-[174px] flex-col p-4">
              <p className="text-xs text-[#E89B55]">
                {p.date} | {p.read}
              </p>
              <h3 className="mt-2 text-base font-bold leading-snug text-foreground">{p.title}</h3>
              <p className="mt-2 text-xs text-muted-foreground">{p.excerpt}</p>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="mt-2 text-xs text-[#E89B55] hover:underline"
              >
                Ler mais →
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 whitespace-nowrap border-b-2 pb-2 transition-colors',
        active ? 'border-primary font-bold text-primary' : 'border-transparent text-foreground hover:text-primary',
      )}
    >
      {children}
    </button>
  );
}

function PageBtn({
  active,
  disabled,
  onClick,
  children,
  label,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'grid size-9 place-items-center rounded-md border text-sm transition-colors disabled:opacity-40',
        active
          ? 'border-primary bg-primary font-bold text-primary-foreground'
          : 'border-border font-normal text-[#F7F3EC] hover:border-primary/50',
      )}
    >
      {children}
    </button>
  );
}

function fmtPrice(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

function PriceFilter({ min, max, onApply }: { min?: string; max?: string; onApply: (lo: string, hi: string) => void }) {
  const [range, setRange] = useState<number[]>([min ? Number(min) : PRICE_MIN, max ? Number(max) : PRICE_MAX]);
  return (
    <div>
      <Slider
        min={PRICE_MIN}
        max={PRICE_MAX}
        step={0.01}
        value={range}
        onValueChange={setRange}
        aria-label="Faixa de preço"
      />
      <p className="mt-3 text-sm text-muted-foreground">
        Preço: {fmtPrice(range[0])} - {fmtPrice(range[1])} ETH
      </p>
      <Button size="sm" className="mt-3" onClick={() => onApply(String(range[0]), String(range[1]))}>
        Aplicar
      </Button>
    </div>
  );
}
