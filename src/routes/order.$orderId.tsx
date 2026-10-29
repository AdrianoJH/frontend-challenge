import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Clock, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, Spinner } from '@/components/shared/feedback';
import { useOrder } from '@/features/checkout/hooks';
import { requireAuth } from '@/lib/route-guards';
import { formatEth } from '@/lib/money';
import { shortenHex } from '@/lib/utils';
import type { Order } from '@/types';

export const Route = createFileRoute('/order/$orderId')({
  beforeLoad: ({ location }) => requireAuth(location.href),
  component: OrderPage,
});

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

function tokenIdOf(name: string) {
  return `#${(name.match(/#(\d+)/)?.[1] ?? '0').padStart(4, '0')}`;
}

function OrderPage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const query = useOrder(orderId);

  if (query.isError)
    return (
      <div className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16">
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </div>
    );
  if (!query.data) return <OrderSkeleton />;

  const order = query.data;
  const wallet = order.chain === 'ethereum' ? 'MetaMask' : order.chain;
  const chainLabel = order.chain.charAt(0).toUpperCase() + order.chain.slice(1);

  const details = [
    { label: 'ID da transação', value: order.txHash ? shortenHex(order.txHash, 6, 4) : order.id, mono: true },
    { label: 'Data', value: formatDate(order.createdAt) },
    { label: 'Total', value: `${formatEth(order.total)} ETH` },
    { label: 'Carteira', value: wallet },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-[578px] border-b-[6px] border-b-[#D28A4C] bg-[#241612]">
        <div className="relative space-y-6 p-6 sm:p-8">
          <button
            type="button"
            onClick={() => navigate({ to: '/' })}
            aria-label="Fechar"
            className="absolute right-4 top-4 text-[#D28A4C] transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-5" />
          </button>

          <StatusHeader order={order} />

          <dl className="-mx-6 grid grid-cols-2 gap-x-3 gap-y-3 border-y-[1.5px] border-[#D28A4C] px-6 py-4 text-xs sm:-mx-8 sm:grid-cols-4 sm:px-8">
            {details.map((d, i) => (
              <div key={d.label} className={i > 0 ? 'min-w-0 sm:border-l-2 sm:border-[#3F2319] sm:pl-3' : 'min-w-0'}>
                <dt className="text-[#CFB28C]">{d.label}</dt>
                <dd className={`mt-0.5 truncate text-[#CFB28C] ${d.mono ? 'font-mono' : ''}`}>{d.value}</dd>
              </div>
            ))}
          </dl>

          <section aria-labelledby="receipt-h" className="space-y-3">
            <h2 id="receipt-h" className="font-bold text-[#F7F3EC]">Detalhes da transação</h2>

            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-[#3F2319] pb-2 text-xs font-bold text-[#F7F3EC]">
              <span>NFTs</span>
              <span className="text-center">Edições</span>
              <span className="text-right">Subtotal</span>
            </div>

            <ul className="space-y-3">
              {order.items.map((item) => (
                <li key={item.nftId} className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <img src={item.imageUrl} alt={item.name} width={70} height={70} className="size-[70px] shrink-0 rounded-md object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#F7F3EC]">{item.name}</p>
                      <p className="truncate text-xs text-[#B39463]">ID do token: {tokenIdOf(item.name)}</p>
                    </div>
                  </div>
                  <span className="text-center text-xs text-muted-foreground">(x {item.quantity})</span>
                  <span className="text-right text-sm font-bold tabular-nums text-accent">{formatEth(item.lineTotal)} ETH</span>
                </li>
              ))}
            </ul>

            <dl className="space-y-1.5 pt-2 text-sm">
              {Number(order.discount) > 0 && (
                <Row
                  label={order.couponCode ? `Desconto (${order.couponCode})` : 'Desconto'}
                  value={<span className="tabular-nums text-success">-{formatEth(order.discount)} ETH</span>}
                />
              )}
              <div className="flex items-center justify-between">
                <dt className="text-[#F7F3EC]">Taxa de rede</dt>
                <dd className="tabular-nums text-[#F7F3EC]">{formatEth(order.networkFee)} ETH</dd>
              </div>
              <Row
                label={<span className="font-bold text-[#F7F3EC]">Total</span>}
                value={<span className="text-base font-bold tabular-nums text-accent">{formatEth(order.total)} ETH</span>}
              />
            </dl>

            <div className="border-t border-[#3F2319]" aria-hidden />
          </section>

          {order.status === 'confirmed' && (
            <p className="text-center text-xs leading-relaxed text-[#CFB28C]">
              Transação confirmada na {chainLabel}. A propriedade foi transferida para sua carteira conectada e registrada na rede.
            </p>
          )}

          <div className="flex flex-col items-center gap-3">
            {order.txHash && (
              <Button asChild className="px-8 text-[#140D0A]">
                <a href="#" onClick={(e) => e.preventDefault()} title="Link de exploração simulado">
                  Ver no Etherscan
                </a>
              </Button>
            )}
            {order.status === 'rejected' && (
              <Button variant="outline" asChild>
                <Link to="/cart">Revisar carrinho</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusHeader({ order }: { order: Order }) {
  if (order.status === 'pending') {
    return (
      <div className="flex flex-col items-center gap-3 text-center" role="status" aria-live="polite">
        <Clock className="size-10 text-accent" />
        <h1 className="text-lg font-bold text-[#F7F3EC]">Processando pagamento…</h1>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Aguardando confirmação. Esta página atualiza sozinha.
        </p>
      </div>
    );
  }
  if (order.status === 'confirmed') {
    return (
      <div className="flex flex-col items-center gap-3 text-center" role="status" aria-live="polite">
        <img src="/images/thank-you.svg" alt="" width={80} height={80} className="size-20" />
        <h1 className="text-base font-bold text-[#CFB28C]">Seus NFTs agora estão na sua carteira</h1>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 text-center" role="alert">
      <XCircle className="size-10 text-destructive" />
      <h1 className="text-lg font-bold text-[#F7F3EC]">Pagamento recusado</h1>
      <p className="max-w-md text-sm text-muted-foreground">{order.rejectionReason ?? 'A simulação recusou o pagamento.'}</p>
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

function OrderSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-[480px] bg-[#241612] p-8">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="size-12 rounded-lg" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="mt-6 h-14 w-full" />
        <Skeleton className="mt-6 h-48 w-full" />
      </div>
    </div>
  );
}
