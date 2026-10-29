import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AlertTriangle, ChevronLeft, Minus, Plus, Trash, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState, Spinner } from '@/components/shared/feedback';
import { RelatedCarousel } from '@/components/nft/related-carousel';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useNftList } from '@/features/nfts/hooks';
import { useCart, useRemoveFromCart, useSetCartQuantity } from '@/features/cart/hooks';
import { useQuote, buildQuoteInput } from '@/features/checkout/hooks';
import { useAuth } from '@/features/auth/auth';
import { useToast } from '@/components/ui/toast';
import { cmpEth, formatEth, mulEth } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { Cart } from '@/types';

export const Route = createFileRoute('/cart')({
  component: CartPage,
});

const COUPON_KEY = 'nftm.coupon';

function CartPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const related = useNftList({ page: 1, pageSize: 15 });
  const isMobile = useIsMobile();

  if (cart.isLoading) return <CartSkeleton />;
  if (cart.isError) return <div className="mx-auto w-full max-w-[1440px] px-6 py-8 sm:px-10 lg:px-16"><ErrorState error={cart.error} onRetry={() => cart.refetch()} /></div>;

  const data = cart.data!;
  if (data.items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16">
        <h1 className="mb-6 text-2xl font-bold uppercase tracking-tight">Carrinho de NFTs</h1>
        <EmptyState
          title="Seu carrinho está vazio"
          description="Explore o catálogo e adicione NFTs para continuar."
          action={
            <Button asChild>
              <Link to="/">Explorar NFTs</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const onCheckout = () =>
    navigate({ to: isAuthenticated ? '/checkout' : '/login', search: isAuthenticated ? undefined : { redirect: '/checkout' } });

  return isMobile ? (
      <MobileCart cart={data} onCheckout={onCheckout} />
  ) : (
      <div className="mx-auto w-full max-w-[1440px] px-6 py-8 sm:px-10 lg:px-16">
        <p className="mb-6 text-sm font-bold text-foreground">
          Início <span className="text-muted-foreground">/</span> Mercado <span className="text-muted-foreground">/</span> Carrinho
        </p>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:gap-20">
          <div>
            <div className="hidden h-10 items-end gap-4 border-b border-primary/40 px-4 pb-3 text-sm font-bold text-foreground sm:flex">
              <span className="flex-1">NFTs</span>
              <span className="w-24">Preço</span>
              <span className="w-28">Edições</span>
              <span className="w-28">Total</span>
              <span className="w-9" aria-hidden />
            </div>

            <ul className="mt-3 space-y-3" aria-label="Itens do carrinho">
              {data.items.map((item) => (
                <CartRow key={item.nftId} item={item} />
              ))}
            </ul>
          </div>

          <CartSummary cart={data} onCheckout={onCheckout} />
        </div>

        <div className="mt-12">
          <RelatedCarousel title="Colecionadores também viram" items={related.data?.items ?? []} rounded />
        </div>
      </div>
  );
}

function CartRow({ item }: { item: Cart['items'][number] }) {
  const setQty = useSetCartQuantity();
  const remove = useRemoveFromCart();
  const { toast } = useToast();

  const priceChanged = cmpEth(item.unitPrice, item.nft.price) !== 0;
  const lineTotal = mulEth(item.nft.price, item.quantity);
  const tokenId = `#${(item.nft.name.match(/#(\d+)/)?.[1] ?? '0').padStart(4, '0')}`;
  const max = Math.max(item.quantity, item.nft.editionsAvailable);
  const changeQty = (q: number) =>
    setQty.mutate(
      { nftId: item.nftId, quantity: q },
      { onError: () => toast({ title: 'Quantidade indisponível', variant: 'error' }) },
    );

  return (
    <li>
      <div className="flex flex-col gap-4 rounded-lg bg-card p-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Link to="/nfts/$slug" params={{ slug: item.nft.slug }} className="shrink-0">
            <img src={item.nft.imageUrl} alt={item.nft.name} width={70} height={70} className="size-[70px] rounded-md" />
          </Link>
          <div className="min-w-0">
            <Link to="/nfts/$slug" params={{ slug: item.nft.slug }} className="block truncate font-bold hover:text-primary">
              {item.nft.name}
            </Link>
            <p className="truncate text-sm text-[#B39463]">ID do token: {tokenId}</p>
          </div>
        </div>

        <div className="flex w-24 items-center justify-between sm:justify-start">
          <span className="text-sm text-muted-foreground sm:hidden">Preço</span>
          <span className="font-bold tabular-nums text-accent">{formatEth(item.nft.price)} ETH</span>
        </div>

        <div className="flex w-full items-center justify-between sm:w-28 sm:justify-start">
          <span className="text-sm text-muted-foreground sm:hidden">Edições</span>
          <div className="inline-flex items-center gap-1.5" role="group" aria-label="Quantidade">
            <Button type="button" size="icon" className="h-8 w-6 rounded-full text-[#140D0A]" disabled={setQty.isPending} onClick={() => changeQty(Math.max(1, item.quantity - 1))} aria-label="Diminuir quantidade">
              <Minus className="size-3" />
            </Button>
            <span className="w-6 text-center text-sm tabular-nums">{item.quantity}</span>
            <Button type="button" size="icon" className="h-8 w-6 rounded-full text-[#140D0A]" disabled={setQty.isPending} onClick={() => changeQty(Math.min(max, item.quantity + 1))} aria-label="Aumentar quantidade">
              <Plus className="size-3" />
            </Button>
          </div>
        </div>

        <div className="flex w-28 items-center justify-between sm:justify-start">
          <span className="text-sm text-muted-foreground sm:hidden">Total</span>
          <div>
            {priceChanged && (
              <Badge variant="accent" className="mb-1 gap-1">
                <AlertTriangle className="size-3" /> preço atualizado
              </Badge>
            )}
            {priceChanged && (
              <span className="block text-xs tabular-nums text-muted-foreground line-through">{formatEth(mulEth(item.unitPrice, item.quantity))} ETH</span>
            )}
            <span className="font-bold tabular-nums text-accent">{formatEth(lineTotal)} ETH</span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="self-end text-muted-foreground sm:self-center"
          aria-label={`Remover ${item.nft.name}`}
          onClick={() => remove.mutate(item.nftId, { onSuccess: () => toast({ title: 'Item removido' }) })}
          disabled={remove.isPending}
        >
          <Trash className="size-4" />
        </Button>
      </div>
    </li>
  );
}

function useCartSummary(cart: Cart) {
  const [coupon, setCoupon] = useState(() => localStorage.getItem(COUPON_KEY) ?? '');
  const [appliedCoupon, setAppliedCoupon] = useState(() => localStorage.getItem(COUPON_KEY) ?? '');

  const chain = cart.items[0]?.nft.chain ?? 'ethereum';
  const quoteInput = buildQuoteInput(
    chain,
    cart.items.map((i) => ({ nftId: i.nftId, quantity: i.quantity, expectedUnitPrice: i.unitPrice })),
    appliedCoupon || undefined,
  );
  const quote = useQuote(quoteInput);

  useEffect(() => {
    if (appliedCoupon) localStorage.setItem(COUPON_KEY, appliedCoupon);
    else localStorage.removeItem(COUPON_KEY);
  }, [appliedCoupon]);

  const applyCoupon = () => setAppliedCoupon(coupon.trim());
  const removeCoupon = () => {
    setCoupon('');
    setAppliedCoupon('');
  };

  return { coupon, setCoupon, appliedCoupon, applyCoupon, removeCoupon, quote };
}

const APPLY_BG = 'linear-gradient(93.11deg, rgba(210, 138, 76, 0.54) -0.94%, #D28A4C 105.02%)';
const CARD_BG = 'linear-gradient(93.11deg, #241612 -0.94%, #241612 105.02%)';

function MobileCart({ cart, onCheckout }: { cart: Cart; onCheckout: () => void }) {
  const { coupon, setCoupon, appliedCoupon, applyCoupon, removeCoupon, quote } = useCartSummary(cart);
  const q = quote.data;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-[#140D0A] lg:hidden">
      <div className="flex items-center gap-3 p-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          aria-label="Voltar"
          className="grid size-[35px] shrink-0 place-items-center rounded-full border border-[#3F2319] bg-[#2F1D15] text-[#CFB28C]"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-[#F7F3EC]">Carrinho de NFTs</h1>
        <span className="size-[35px] shrink-0" aria-hidden />
      </div>

      <ul className="space-y-4 px-4 pb-6" aria-label="Itens do carrinho">
        {cart.items.map((item) => (
          <MobileCartRow key={item.nftId} item={item} />
        ))}
      </ul>

      <div className="mt-auto space-y-4 rounded-t-[40px] bg-[#241612] p-5">
        <div className="flex items-stretch overflow-hidden rounded-[40px] border border-[#3F2319] shadow-[0px_6px_20px_0px_#0A060473]">
          <input
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            placeholder="Digite o código promocional..."
            aria-label="Código promocional"
            className="min-w-0 flex-1 bg-transparent px-5 text-sm text-foreground outline-none placeholder:text-xs placeholder:text-[#B39463]"
          />
          {appliedCoupon ? (
            <Button onClick={removeCoupon} className="rounded-full text-[#F5F1EB]" style={{ background: APPLY_BG }} aria-label="Remover cupom">
              <X className="size-4" />
            </Button>
          ) : (
            <Button onClick={applyCoupon} className="rounded-full text-[#F5F1EB]" style={{ background: APPLY_BG }}>
              Aplicar
            </Button>
          )}
        </div>

        {q && (
          <dl className="space-y-3 text-sm" aria-live="polite">
            <Row label="Subtotal" value={<span className="text-base tabular-nums text-[#F7F3EC]">{formatEth(q.subtotal)} ETH</span>} />
            <Row
              label="Desconto do lançamento"
              value={
                cmpEth(q.discount, '0') > 0 ? (
                  <span className="text-base tabular-nums text-success">-{formatEth(q.discount)} ETH</span>
                ) : (
                  <span className="text-base text-[#F7F3EC]">(-) 00.00</span>
                )
              }
            />
            <div className="flex items-start justify-between">
              <dt className="text-[#F7F3EC]">Taxa de rede</dt>
              <dd className="text-right">
                <span className="block text-base tabular-nums text-[#F7F3EC]">{formatEth(q.networkFee)} ETH</span>
                <span className="text-xs text-accent">Taxa estimada</span>
              </dd>
            </div>
            <div className="pt-1">
              <Row
                label={<span className="text-base font-bold text-[#F7F3EC]">Total</span>}
                value={<span className="text-lg font-bold tabular-nums text-accent">{formatEth(q.total)} ETH</span>}
              />
            </div>
          </dl>
        )}

        <Button className="w-full rounded-full text-[#140D0A]" size="lg" onClick={onCheckout} disabled={quote.isLoading}>
          {quote.isFetching && <Spinner />}
          Conectar e finalizar
        </Button>
      </div>
    </div>
  );
}

function MobileCartRow({ item }: { item: Cart['items'][number] }) {
  const setQty = useSetCartQuantity();
  const { toast } = useToast();
  const max = Math.max(item.quantity, item.nft.editionsAvailable);
  const canDecrement = item.quantity > 1;
  const changeQty = (qty: number) =>
    setQty.mutate(
      { nftId: item.nftId, quantity: qty },
      { onError: () => toast({ title: 'Quantidade indisponível', variant: 'error' }) },
    );

  return (
    <li
      className="flex items-center gap-3 rounded-2xl p-3 shadow-[0px_6px_20px_0px_#0A060473]"
      style={{ background: CARD_BG }}
    >
      <Link to="/nfts/$slug" params={{ slug: item.nft.slug }} className="shrink-0">
        <img src={item.nft.imageUrl} alt={item.nft.name} width={64} height={64} className="size-16 rounded-xl" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to="/nfts/$slug" params={{ slug: item.nft.slug }} className="block truncate font-bold text-[#F7F3EC]">
          {item.nft.name}
        </Link>
        <p className="text-xs text-[#B39463]">Edição: 1/{item.nft.editionsAvailable}</p>
        <p className="mt-0.5 font-bold tabular-nums text-accent">{formatEth(item.nft.price)} ETH</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5" role="group" aria-label="Quantidade">
        <button
          type="button"
          disabled={setQty.isPending}
          onClick={() => changeQty(Math.max(1, item.quantity - 1))}
          aria-label="Diminuir quantidade"
          className="grid size-6 place-items-center rounded-full border border-[#3F2319] bg-[#2F1D15]"
        >
          <Minus className={cn('size-3', canDecrement ? 'text-[#F5F1EB]' : 'text-[#55321F]')} />
        </button>
        <span className="w-5 text-center text-sm tabular-nums text-[#F7F3EC]">{item.quantity}</span>
        <button
          type="button"
          disabled={setQty.isPending}
          onClick={() => changeQty(Math.min(max, item.quantity + 1))}
          aria-label="Aumentar quantidade"
          className="grid size-6 place-items-center rounded-full border border-[#3F2319] bg-[#2F1D15]"
        >
          <Plus className="size-3 text-[#F5F1EB]" />
        </button>
      </div>
    </li>
  );
}

function CartSummary({ cart, onCheckout }: { cart: Cart; onCheckout: () => void }) {
  const { coupon, setCoupon, appliedCoupon, applyCoupon, removeCoupon, quote } = useCartSummary(cart);
  const q = quote.data;
  const couponInvalid = q?.coupon && !q.coupon.valid;
  const hasChanges = q?.lines.some((l) => l.changed);

  return (
    <aside className="lg:sticky lg:top-20 lg:self-start">
      <div className="space-y-5">
          <div className="flex h-10 items-end border-b border-primary/40 pb-3">
            <h2 className="text-lg font-bold tracking-tight">Resumo da carteira</h2>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="coupon" className="text-sm font-bold">
              Código promocional
            </label>
            <div className="flex items-stretch overflow-hidden rounded-md border-2 border-[#D28A4C]">
              <input
                id="coupon"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="Digite o código promocional..."
                aria-invalid={couponInvalid || undefined}
                aria-describedby={couponInvalid ? 'coupon-error' : undefined}
                className="min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-xs placeholder:text-[#B39463]"
              />
              {appliedCoupon ? (
                <Button onClick={removeCoupon} className="rounded-none text-[#140D0A]" aria-label="Remover cupom">
                  <X className="size-4" />
                </Button>
              ) : (
                <Button onClick={applyCoupon} className="rounded-none text-[#140D0A]">
                  Aplicar
                </Button>
              )}
            </div>
            {couponInvalid && (
              <p id="coupon-error" className="text-xs text-destructive">
                {q?.coupon?.error === 'expired' ? 'Cupom expirado.' : q?.coupon?.error === 'min_not_met' ? 'Subtotal mínimo não atingido.' : 'Cupom inválido.'}
              </p>
            )}
            {q?.coupon?.valid && <p className="text-xs text-success">Cupom {q.coupon.code} aplicado ({q.coupon.percentOff}% off).</p>}
          </div>

          {quote.isLoading ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          ) : q ? (
            <dl className="space-y-3 text-sm" aria-live="polite">
              <Row label="Subtotal" value={<span className="text-base tabular-nums text-[#F7F3EC]">{formatEth(q.subtotal)} ETH</span>} />
              <Row
                label="Desconto do lançamento"
                value={
                  cmpEth(q.discount, '0') > 0 ? (
                    <span className="text-base tabular-nums text-success">-{formatEth(q.discount)} ETH</span>
                  ) : (
                    <span className="text-base text-[#F7F3EC]">(-) 00.00</span>
                  )
                }
              />
              <div className="flex items-start justify-between">
                <dt className="text-[#F7F3EC]">Taxa de rede</dt>
                <dd className="text-right">
                  <span className="block text-base tabular-nums text-[#F7F3EC]">{formatEth(q.networkFee)} ETH</span>
                  <span className="text-xs text-accent">Taxa estimada</span>
                </dd>
              </div>
              <div className="pt-3">
                <Row
                  label={<span className="text-base font-bold text-[#F7F3EC]">Total</span>}
                  value={<span className="text-lg font-bold tabular-nums text-accent">{formatEth(q.total)} ETH</span>}
                />
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Não foi possível calcular o resumo.</p>
          )}

          {hasChanges && (
            <p className="flex items-center gap-1.5 rounded-md bg-accent/10 p-2 text-xs text-accent">
              <AlertTriangle className="size-3.5" /> Preços ou disponibilidade mudaram. Revise antes de finalizar.
            </p>
          )}

          <div className="space-y-3">
            <Button className="w-full text-[#140D0A]" size="lg" onClick={onCheckout} disabled={quote.isLoading}>
              {quote.isFetching && <Spinner />}
              Conectar e finalizar
            </Button>
            <Link to="/" className="block text-center text-sm text-accent hover:underline">
              Continuar explorando
            </Link>
          </div>
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[#F7F3EC]">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-8 sm:px-10 lg:px-16">
      <Skeleton className="mb-6 h-9 w-56" />
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </div>
  );
}
