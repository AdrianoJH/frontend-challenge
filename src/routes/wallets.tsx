import { createFileRoute } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner, ErrorState } from '@/components/shared/feedback';
import { ProfileSidebar } from '@/features/account/profile-sidebar';
import { useWallets, useAddWallet } from '@/features/account/hooks';
import { useToast } from '@/components/ui/toast';
import { requireAuth } from '@/lib/route-guards';
import { ApiError } from '@/lib/api-error';
import { cn, shortenHex } from '@/lib/utils';
import type { WalletInput } from '@/types';

export const Route = createFileRoute('/wallets')({
  beforeLoad: ({ location }) => requireAuth(location.href),
  component: WalletsPage,
});

const schema = z.object({
  label: z.string().min(1, 'Informe um rótulo.'),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço inválido (0x + 40 hex).'),
});
type FormValues = z.infer<typeof schema>;

function WalletsPage() {
  const wallets = useWallets();
  const addWallet = useAddWallet();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { label: '', address: '' } });

  async function onSubmit(values: FormValues) {
    const input: WalletInput = { label: values.label, address: values.address, chain: 'ethereum', kind: 'secondary' };
    try {
      await addWallet.mutateAsync(input);
      toast({ title: 'Carteira cadastrada', variant: 'success' });
      reset({ label: '', address: '' });
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        for (const [field, message] of Object.entries(error.fields)) setError(field as keyof FormValues, { message });
        return;
      }
      toast({ title: 'Falha ao salvar a carteira', variant: 'error' });
    }
  }

  function outOfScope() {
    toast({ title: 'Fora do escopo', description: 'Esta área não faz parte da entrega.' });
  }

  const secondary = wallets.data?.filter((w) => w.kind === 'secondary') ?? [];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-8 sm:px-10 lg:px-16">
      <div className="grid gap-10 lg:grid-cols-[310px_1fr] lg:gap-16">
        <ProfileSidebar active="Carteiras" />

        <div>
          <div className="mb-1 flex items-center justify-between">
            <h1 className="text-lg font-bold text-[#F7F3EC]">Carteira principal</h1>
            <button type="button" onClick={outOfScope} className="text-sm text-accent hover:underline">Adicionar</button>
          </div>
          <p className="mb-6 text-sm text-muted-foreground">
            Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <WField label="Nome de exibição" required placeholder="Nome de exibição" />

              <div className="space-y-1.5">
                <label htmlFor="w-label" className="block text-sm text-[#F5F1EB]">Apelido da carteira <span className="text-accent">*</span></label>
                <Input id="w-label" className="rounded-[3px] bg-transparent" placeholder="Apelido da carteira" {...register('label')} />
                {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
              </div>

              <WSelect label="Rede" required defaultValue="">
                <option value="" disabled>Selecione uma rede</option>
                <option>Ethereum</option>
                <option>Polygon</option>
                <option>Solana</option>
              </WSelect>
              <WField label="Nome do perfil" required placeholder="Nome do perfil" />

              <div className="space-y-1.5">
                <label htmlFor="w-address" className="block text-sm text-[#F5F1EB]">Endereço da carteira <span className="text-accent">*</span></label>
                <Input id="w-address" className="rounded-[3px] bg-transparent font-mono" placeholder="Endereço 0x da carteira" {...register('address')} />
                {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
              </div>
              <WField label="ENS ou carteira secundária (opcional)" placeholder="ENS ou carteira secundária (opcional)" />

              <WSelect label="Tipo de carteira" required defaultValue="">
                <option value="" disabled>Selecione uma carteira</option>
                <option>MetaMask</option>
                <option>WalletConnect</option>
                <option>Coinbase Wallet</option>
              </WSelect>
              <WField label="Código de indicação" required placeholder="Código de indicação" />

              <WField label="E-mail" required type="email" placeholder="email@exemplo.com" />
              <WSelect label="Nome ENS" required narrow defaultValue=".eth">
                <option>.eth</option>
                <option>.lens</option>
              </WSelect>
            </div>

            <Button type="submit" className="mt-8 text-[#140D0A]" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando…' : 'Salvar carteira'}
            </Button>
          </form>

          <div className="mt-10">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-[#F7F3EC]">Carteira secundária</h2>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-2 text-[#F5F1EB]">
                  <span className="grid size-4 place-items-center rounded-full border border-[#D28A4C]" aria-hidden />
                  Igual à carteira principal
                </span>
                <button type="button" onClick={outOfScope} className="text-accent hover:underline">Adicionar</button>
              </div>
            </div>

            {wallets.isLoading ? (
              <Spinner label="Carregando carteiras" />
            ) : wallets.isError ? (
              <ErrorState error={wallets.error} onRetry={() => wallets.refetch()} />
            ) : secondary.length > 0 ? (
              <ul className="space-y-3">
                {secondary.map((w) => (
                  <li key={w.id} className="rounded-lg bg-[#241612] p-4">
                    <p className="font-bold text-[#F7F3EC]">{w.label}</p>
                    <p className="font-mono text-xs text-muted-foreground" title={w.address}>
                      {shortenHex(w.address)} · <span className="capitalize">{w.chain}</span>
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Você ainda não adicionou uma carteira secundária.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WField({ label, required, ...props }: { label: string; required?: boolean } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm text-[#F5F1EB]">
        {label} {required && <span className="text-accent">*</span>}
      </label>
      <Input className="rounded-[3px] bg-transparent" {...props} />
    </div>
  );
}

function WSelect({ label, required, narrow, children, ...props }: { label: string; required?: boolean; narrow?: boolean } & React.ComponentProps<'select'>) {
  const color = narrow ? 'text-[#F5F1EB]' : 'text-[#B39463]';
  return (
    <div className="space-y-1.5">
      <label className="block text-sm text-[#F5F1EB]">
        {label} {required && <span className="text-accent">*</span>}
      </label>
      <div className={narrow ? 'relative w-20' : 'relative w-full'}>
        <select
          className={cn('h-10 w-full appearance-none rounded-[3px] border border-input bg-transparent pl-3 pr-9 text-sm focus-visible:border-[#D28A4C] focus-visible:outline-none focus-visible:ring-0', color)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className={cn('pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2', color)} />
      </div>
    </div>
  );
}
