import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, MoreVertical, Plug, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState, Spinner } from '@/components/shared/feedback';
import { useCart } from '@/features/cart/hooks';
import { useQuote, buildQuoteInput, useCreateOrder } from '@/features/checkout/hooks';
import { useProfile, useWallets } from '@/features/account/hooks';
import { useToast } from '@/components/ui/toast';
import { requireAuth } from '@/lib/route-guards';
import { ApiError } from '@/lib/api-error';
import { formatEth, mulEth } from '@/lib/money';
import { cn, shortenHex } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import type { CreateOrderInput } from '@/types';

export const Route = createFileRoute('/checkout')({
  beforeLoad: ({ location }) => requireAuth(location.href),
  component: CheckoutPage,
});

type ConnState = 'idle' | 'connecting' | 'connected' | 'refused';

const COUPON_KEY = 'nftm.coupon';

const WALLET_OPTIONS = [
  { id: 'networks', label: null },
  { id: 'metamask', label: 'MetaMask' },
  { id: 'coinbase', label: 'Coinbase Wallet' },
] as const;

const MOBILE_PROVIDERS = [
  { id: 'walletconnect', label: 'WalletConnect', letter: 'W' as string | null },
  { id: 'metamask', label: 'MetaMask', letter: 'M' as string | null },
  { id: 'coinbase', label: 'Coinbase Wallet', letter: null },
] as const;

function pendingKeyFor(userId: string) {
  return `nftm.checkout.${userId}`;
}
function newIdemKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `idem-${Date.now()}-${Math.round(performance.now())}`;
}
function tokenIdOf(name: string) {
  return `#${(name.match(/#(\d+)/)?.[1] ?? '0').padStart(4, '0')}`;
}

function CheckoutPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const cart = useCart();
  const profile = useProfile();
  const wallets = useWallets();
  const createOrder = useCreateOrder();

  const [collector, setCollector] = useState({ name: '', email: '' });
  const [walletId, setWalletId] = useState<string>('');
  const [walletOption, setWalletOption] = useState<string>('coinbase');
  const [usarOutra, setUsarOutra] = useState(false);
  const [conn, setConn] = useState<ConnState>('idle');
  const isMobile = useIsMobile();
  const idemKeyRef = useRef<string | null>(null);
  const lastQuoteIdRef = useRef<string | null>(null);
  const [quoteChangedNotice, setQuoteChangedNotice] = useState(false);

  useEffect(() => {
    if (profile.data) setCollector({ name: profile.data.name, email: profile.data.email });
  }, [profile.data]);

  useEffect(() => {
    if (wallets.data?.length && !walletId) {
      setWalletId(wallets.data[0].id);
    }
  }, [wallets.data, walletId]);

  const items = cart.data?.items ?? [];
  const selectedWallet = wallets.data?.find((w) => w.id === walletId);
  const chain = selectedWallet?.chain ?? items[0]?.nft.chain ?? 'ethereum';
  const coupon = localStorage.getItem(COUPON_KEY) ?? undefined;

  const quoteInput = items.length
    ? buildQuoteInput(chain, items.map((i) => ({ nftId: i.nftId, quantity: i.quantity, expectedUnitPrice: i.unitPrice })), coupon)
    : null;
  const quote = useQuote(quoteInput);

  useEffect(() => {
    const id = quote.data?.quoteId;
    if (!id) return;
    if (lastQuoteIdRef.current && lastQuoteIdRef.current !== id) {
      setQuoteChangedNotice(true);
      toast({ title: 'Os valores foram atualizados', description: 'Revise o resumo antes de confirmar.', variant: 'default' });
    }
    lastQuoteIdRef.current = id;
  }, [quote.data?.quoteId, toast]);

  if (cart.isLoading || profile.isLoading) return <CheckoutSkeleton />;
  if (cart.isError) return <div className="mx-auto w-full max-w-[1440px] px-6 py-8 sm:px-10 lg:px-16"><ErrorState error={cart.error} onRetry={() => cart.refetch()} /></div>;

  if (!items.length) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16">
        <EmptyState title="Nada para pagar" description="Seu carrinho está vazio." action={<Button asChild><Link to="/">Explorar</Link></Button>} />
      </div>
    );
  }

  function connectWallet() {
    setConn('connecting');
    setTimeout(() => {
      setConn('connected');
      toast({ title: 'Carteira conectada', variant: 'success' });
    }, 600);
  }

  const q = quote.data;
  const hasChanges = q?.lines.some((l) => l.changed) || quoteChangedNotice;
  const canSubmit = !!q && !!selectedWallet && !!collector.name.trim() && /\S+@\S+\.\S+/.test(collector.email) && !createOrder.isPending;

  async function submit() {
    if (!q || !selectedWallet) return;
    // mesma chave em todas as tentativas pra não duplicar pedido
    if (!idemKeyRef.current) idemKeyRef.current = newIdemKey();
    const key = idemKeyRef.current;

    const input: CreateOrderInput = {
      quoteId: q.quoteId,
      chain,
      walletId: selectedWallet.id,
      collector,
      couponCode: coupon,
      items: items.map((i) => ({ nftId: i.nftId, quantity: i.quantity })),
    };

    const userId = profile.data!.id;
    localStorage.setItem(pendingKeyFor(userId), JSON.stringify({ key }));

    try {
      const order = await createOrder.mutateAsync({ input, idempotencyKey: key });
      localStorage.setItem(pendingKeyFor(userId), JSON.stringify({ key, orderId: order.id }));
      idemKeyRef.current = null;
      navigate({ to: '/order/$orderId', params: { orderId: order.id } });
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'timeout' || err.isRetriable)) {
        try {
          const recovered = await createOrder.mutateAsync({ input, idempotencyKey: key });
          idemKeyRef.current = null;
          navigate({ to: '/order/$orderId', params: { orderId: recovered.id } });
          return;
        } catch {
          toast({ title: 'Tempo esgotado', description: 'Não foi possível confirmar. Tente recuperar o pedido.', variant: 'error' });
          return;
        }
      }
      if (err instanceof ApiError && err.code === 'conflict') {
        setQuoteChangedNotice(true);
        quote.refetch();
        toast({ title: 'A cotação mudou', description: 'Revise os novos valores e confirme novamente.', variant: 'error' });
        return;
      }
      toast({ title: 'Falha no pagamento', description: err instanceof ApiError ? err.message : undefined, variant: 'error' });
    }
  }

  return isMobile ? (
      <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-[#140D0A]">
        <div className="flex items-center gap-3 p-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            aria-label="Voltar"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[#3F2319] bg-[#2F1D15] text-[#CFB28C]"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="text-lg font-bold text-[#F7F3EC]">Pagamento com carteira</h1>
        </div>

        <div className="flex-1 space-y-6 px-4 py-2">
          {!!wallets.data?.length && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#F7F3EC]">Carteira conectada</h2>
                <span className="text-sm text-accent">Trocar carteira</span>
              </div>
              <div className="space-y-3">
                {wallets.data.map((w) => {
                  const selected = w.id === walletId;
                  const chainLabel = w.chain.charAt(0).toUpperCase() + w.chain.slice(1);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => { setWalletId(w.id); setConn('idle'); }}
                      className="flex w-full items-center gap-3 rounded-xl bg-[#241612] p-4 text-left"
                    >
                      <Radio selected={selected} />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#F7F3EC]">{w.label}</p>
                        <p className="text-xs text-muted-foreground">{shortenHex(w.address)}</p>
                        <p className="text-xs text-muted-foreground">Rede {w.kind === 'primary' ? 'principal ' : ''}{chainLabel}</p>
                      </div>
                      <MoreVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-3 text-sm font-bold text-[#F7F3EC]">Carteira e rede</h2>
            <div className="space-y-3" role="radiogroup" aria-label="Carteira e rede">
              {MOBILE_PROVIDERS.map((p) => {
                const selected = walletOption === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setWalletOption(p.id)}
                    className="flex w-full items-center gap-3 rounded-xl bg-[#241612] p-4 text-left"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[#3F2319] bg-[#2F1D15] text-xs font-bold text-[#D28A4C]">
                      {p.letter ?? <Wallet className="size-5" />}
                    </span>
                    <span className="flex-1 font-medium text-[#F7F3EC]">{p.label}</span>
                    <Radio selected={selected} />
                  </button>
                );
              })}
            </div>
          </div>

          {q && (
            <p className="text-right text-sm font-bold text-[#F7F3EC]">
              Total: <span className="text-accent">{formatEth(q.total)} ETH</span>
            </p>
          )}
        </div>

        <div className="p-4">
          <Button className="h-[56px] w-full rounded-full text-[#140D0A]" onClick={submit} disabled={!canSubmit}>
            {createOrder.isPending && <Spinner />}
            Confirmar compra
          </Button>
        </div>
      </div>
  ) : (
      <div className="mx-auto w-full max-w-[1440px] px-6 py-8 sm:px-10 lg:px-16">
        <p className="mb-8 text-sm font-bold text-foreground">
          Início <span className="text-muted-foreground">/</span> Mercado <span className="text-muted-foreground">/</span> Pagamento
        </p>

      <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-16">
        {/* só nome/e-mail são reais; os demais campos são ilustrativos (fora do escopo) */}
        <section aria-labelledby="perfil-h">
          <h2 id="perfil-h" className="mb-6 text-lg font-bold">Perfil do colecionador</h2>

          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <LField label="Nome de exibição" required value={collector.name} onChange={(e) => setCollector((c) => ({ ...c, name: e.target.value }))} />
            <LField label="Nome de usuário" required placeholder="@usuario" />

            <LSelect label="Rede" required defaultValue="">
              <option value="" disabled>Selecione uma rede</option>
              <option>Ethereum</option>
              <option>Polygon</option>
              <option>Solana</option>
            </LSelect>
            <LField label="Nome do perfil" required placeholder="Nome do perfil" />

            <LField label="Endereço da carteira" required placeholder="Endereço 0x da carteira" />
            <LField label="ENS ou carteira secundária (opcional)" placeholder="ENS ou carteira secundária (opcional)" />

            <LSelect label="Tipo de carteira" required defaultValue="">
              <option value="" disabled>Selecione uma carteira</option>
              <option>MetaMask</option>
              <option>WalletConnect</option>
              <option>Coinbase Wallet</option>
            </LSelect>
            <LField label="Código de indicação" required placeholder="Código de indicação" />

            <LField label="E-mail" required type="email" value={collector.email} onChange={(e) => setCollector((c) => ({ ...c, email: e.target.value }))} />
            <LSelect label="Nome ENS" required narrow defaultValue=".eth">
              <option>.eth</option>
              <option>.lens</option>
            </LSelect>
          </div>

          <div className="sm:max-w-[calc(50%-0.75rem)]">
            <button
              type="button"
              role="radio"
              aria-checked={usarOutra}
              onClick={() => setUsarOutra((v) => !v)}
              className="mt-5 flex items-center gap-2 text-sm text-[#F5F1EB]"
            >
              <Radio selected={usarOutra} />
              Usar outra carteira?
            </button>

            <div className="mt-5 space-y-1.5">
              <label htmlFor="obs" className="block text-sm text-[#F5F1EB]">Observação do colecionador (opcional)</label>
              <textarea
                id="obs"
                rows={5}
                placeholder="Observação do colecionador (opcional)"
                className="w-full rounded-[3px] border border-input bg-transparent p-3 text-sm placeholder:text-muted-foreground focus-visible:border-[#D28A4C] focus-visible:outline-none focus-visible:ring-0"
              />
            </div>
          </div>
        </section>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <h2 className="mb-3 text-lg font-bold">Seus NFTs</h2>
          <div className="flex items-center justify-between border-b border-primary/40 pb-2 text-sm font-bold text-foreground">
            <span>NFTs</span>
            <span>Subtotal</span>
          </div>

          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.nftId} className="flex h-[70px] items-center rounded-l-lg bg-[#241612]">
                <img src={item.nft.imageUrl} alt={item.nft.name} width={70} height={70} className="h-full w-[70px] shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1 px-3">
                  <p className="truncate text-sm font-bold text-[#F7F3EC]">{item.nft.name}</p>
                  <p className="truncate text-xs text-[#B39463]">ID do token: {tokenIdOf(item.nft.name)}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">(x {item.quantity})</span>
                <span className="shrink-0 px-3 text-sm font-bold tabular-nums text-accent">{formatEth(mulEth(item.nft.price, item.quantity))} ETH</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-center text-sm font-normal text-[#F5F1EB]">
            Tem um código promocional?{' '}
            <Link to="/cart" className="text-[#F5F1EB] underline-offset-2 hover:underline">Aplique aqui</Link>
          </p>

          {quote.isLoading ? (
            <Skeleton className="mt-4 h-24 w-full" />
          ) : q ? (
            <dl className="mt-4 space-y-3 text-sm" aria-live="polite">
              <Row label="Subtotal" value={<span className="text-base tabular-nums text-[#F7F3EC]">{formatEth(q.subtotal)} ETH</span>} />
              <Row
                label="Desconto do lançamento"
                value={
                  q.coupon?.valid ? (
                    <span className="text-base tabular-nums text-success">-{formatEth(q.discount)} ETH</span>
                  ) : (
                    <span className="text-base text-[#F7F3EC]">(-) 00.00</span>
                  )
                }
              />
              <div>
                <div className="flex items-center justify-between">
                  <dt className="text-[#F7F3EC]">Taxa de rede</dt>
                  <dd className="text-base tabular-nums text-[#F7F3EC]">{formatEth(q.networkFee)} ETH</dd>
                </div>
                <p className="mt-1 text-center text-xs text-accent">Taxa estimada</p>
              </div>
              <div className="border-t border-primary/40 pt-3">
                <Row
                  label={<span className="text-base font-bold text-[#F7F3EC]">Total</span>}
                  value={<span className="text-lg font-bold tabular-nums text-accent">{formatEth(q.total)} ETH</span>}
                />
              </div>
            </dl>
          ) : (
            <ErrorState error={quote.error} onRetry={() => quote.refetch()} />
          )}

          <h3 className="mb-3 mt-6 text-center font-bold">Carteira e rede</h3>

          <div className="space-y-3" role="radiogroup" aria-label="Carteira e rede">
            {WALLET_OPTIONS.map((opt) => {
              const selected = walletOption === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={opt.label ?? 'Carteiras compatíveis'}
                  onClick={() => setWalletOption(opt.id)}
                  className={cn(
                    'flex h-[52px] w-full items-center gap-3 rounded-lg border px-4 text-left text-sm transition-colors focus-visible:outline-none',
                    selected ? 'border-[#D28A4C]' : 'border-[#3F2319] hover:border-[#D28A4C]/50',
                  )}
                >
                  <Radio selected={selected} />
                  {opt.label ? (
                    <span className="font-medium text-[#F7F3EC]">{opt.label}</span>
                  ) : (
                    <span className="inline-flex items-center rounded-md border border-[#D28A4C] bg-[#38220F] px-2.5 py-1 text-[10px] font-medium tracking-wide text-[#D28A4C]">
                      {['METAMASK', 'WALLETCONNECT', 'COINBASE'].map((w, i) => (
                        <span key={w} className="flex items-center">
                          {i > 0 && <span className="mx-1.5">·</span>}
                          {w}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {hasChanges && (
            <p className="mt-4 rounded-md bg-accent/10 p-2 text-xs text-accent" role="alert">
              Os valores mudaram. Confira antes de confirmar.
            </p>
          )}

          <div className="mt-4 space-y-3">
            {conn !== 'connected' && (
              <Button variant="secondary" className="w-full" onClick={connectWallet} disabled={conn === 'connecting'}>
                {conn === 'connecting' ? <Spinner /> : <Plug className="size-4" />} Conectar carteira
              </Button>
            )}

            <Button className="h-[52px] w-full text-[#140D0A]" onClick={submit} disabled={!canSubmit}>
              {createOrder.isPending && <Spinner />}
              Confirmar compra
            </Button>
          </div>
        </aside>
      </div>
      </div>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full border border-[#D28A4C]" aria-hidden>
      {selected && <span className="size-2.5 rounded-full bg-[#D28A4C]" />}
    </span>
  );
}

function LField({ label, required, className, ...props }: { label: string; required?: boolean } & React.ComponentProps<typeof Input>) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm text-[#F5F1EB]">
        {label} {required && <span className="text-accent">*</span>}
      </label>
      <Input id={id} className={cn('rounded-[3px] bg-transparent', className)} {...props} />
    </div>
  );
}

function LSelect({ label, required, narrow, children, ...props }: { label: string; required?: boolean; narrow?: boolean } & React.ComponentProps<'select'>) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm text-[#F5F1EB]">
        {label} {required && <span className="text-accent">*</span>}
      </label>
      <div className={cn('relative', narrow ? 'w-20' : 'w-full')}>
        <select
          id={id}
          className="h-10 w-full appearance-none rounded-[3px] border border-input bg-transparent pl-3 pr-9 text-sm text-muted-foreground focus-visible:border-[#D28A4C] focus-visible:outline-none focus-visible:ring-0"
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
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

function CheckoutSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-8 sm:px-10 lg:px-16">
      <Skeleton className="mb-8 h-4 w-48" />
      <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-16">
        <Skeleton className="h-[520px] w-full rounded-lg" />
        <Skeleton className="h-[560px] w-full rounded-lg" />
      </div>
    </div>
  );
}
