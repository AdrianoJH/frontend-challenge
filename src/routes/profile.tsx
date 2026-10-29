import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, Eye, EyeOff, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/shared/feedback';
import { ProfileSidebar } from '@/features/account/profile-sidebar';
import { useProfile, useUpdateProfile, useChangePassword } from '@/features/account/hooks';
import { useToast } from '@/components/ui/toast';
import { requireAuth } from '@/lib/route-guards';
import { ApiError } from '@/lib/api-error';

export const Route = createFileRoute('/profile')({
  beforeLoad: ({ location }) => requireAuth(location.href),
  component: ProfilePage,
});

const schema = z
  .object({
    name: z.string().min(1, 'Informe seu nome.'),
    email: z.string().min(1, 'Informe seu e-mail.').email('E-mail inválido.'),
    avatarUrl: z.string().optional(),
    currentPassword: z.string(),
    newPassword: z.string(),
    confirm: z.string(),
  })
  .superRefine((v, ctx) => {
    // a senha só é validada/alterada se o colecionador preencher algum campo
    if (!v.currentPassword && !v.newPassword && !v.confirm) return;
    if (!v.currentPassword) ctx.addIssue({ code: 'custom', path: ['currentPassword'], message: 'Informe a senha atual.' });
    if (v.newPassword.length < 8) ctx.addIssue({ code: 'custom', path: ['newPassword'], message: 'Mínimo de 8 caracteres.' });
    if (v.newPassword !== v.confirm) ctx.addIssue({ code: 'custom', path: ['confirm'], message: 'As senhas não coincidem.' });
  });
type FormValues = z.infer<typeof schema>;

function ProfilePage() {
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', avatarUrl: '', currentPassword: '', newPassword: '', confirm: '' },
  });
  const { register, handleSubmit, reset, setError, setValue, formState } = form;

  useEffect(() => {
    if (profile.data) {
      // keepDirtyValues preserva o que o usuário já digitou se o perfil chegar depois
      reset(
        { name: profile.data.name, email: profile.data.email, avatarUrl: profile.data.avatarUrl, currentPassword: '', newPassword: '', confirm: '' },
        { keepDirtyValues: true },
      );
    }
  }, [profile.data, reset]);

  async function onSave(values: FormValues) {
    try {
      await updateProfile.mutateAsync({ name: values.name, email: values.email, avatarUrl: values.avatarUrl });
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        for (const [field, message] of Object.entries(error.fields)) setError(field as keyof FormValues, { message });
        return;
      }
      toast({ title: 'Falha ao salvar o perfil', variant: 'error' });
      return;
    }

    if (values.newPassword) {
      try {
        await changePassword.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword });
        setValue('currentPassword', '');
        setValue('newPassword', '');
        setValue('confirm', '');
        toast({ title: 'Senha alterada', variant: 'success' });
      } catch (error) {
        if (error instanceof ApiError && error.fields) {
          for (const [field, message] of Object.entries(error.fields)) setError(field as keyof FormValues, { message });
          return;
        }
        toast({ title: 'Falha ao alterar a senha', variant: 'error' });
        return;
      }
    }

    toast({ title: 'Perfil atualizado', variant: 'success' });
  }

  function outOfScope() {
    toast({ title: 'Fora do escopo', description: 'Esta área não faz parte da entrega.' });
  }

  if (profile.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center py-10">
        <Spinner label="Carregando perfil" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-8 sm:px-10 lg:px-16">
      <div className="grid gap-10 lg:grid-cols-[310px_1fr] lg:gap-16">
        <ProfileSidebar active="Dados do perfil" />

        <div>
          <h1 className="mb-6 text-lg font-bold text-[#F7F3EC]">Perfil do colecionador</h1>

          <form onSubmit={handleSubmit(onSave)} noValidate>
            <input type="hidden" {...register('avatarUrl')} />
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="pf-name" className="block text-sm text-[#F5F1EB]">Nome de exibição <span className="text-accent">*</span></label>
                <Input id="pf-name" className="rounded-[3px] bg-transparent" {...register('name')} />
                {formState.errors.name && <p className="text-xs text-destructive">{formState.errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pf-username" className="block text-sm text-[#F5F1EB]">Nome de usuário <span className="text-accent">*</span></label>
                <Input id="pf-username" className="rounded-[3px] bg-transparent" placeholder="@usuario" />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pf-email" className="block text-sm text-[#F5F1EB]">E-mail <span className="text-accent">*</span></label>
                <Input id="pf-email" type="email" className="rounded-[3px] bg-transparent" {...register('email')} />
                {formState.errors.email && <p className="text-xs text-destructive">{formState.errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pf-ens" className="block text-sm text-[#F5F1EB]">Nome ENS <span className="text-accent">*</span></label>
                <div className="relative w-20">
                  <select id="pf-ens" defaultValue=".eth" className="h-10 w-full appearance-none rounded-[3px] border border-input bg-transparent pl-3 pr-9 text-sm text-[#F5F1EB] focus-visible:border-[#D28A4C] focus-visible:outline-none focus-visible:ring-0">
                    <option className="bg-[#241612] text-[#F5F1EB]">.eth</option>
                    <option className="bg-[#241612] text-[#F5F1EB]">.lens</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#F5F1EB]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pf-apelido" className="block text-sm text-[#F5F1EB]">Apelido da carteira <span className="text-accent">*</span></label>
                <Input id="pf-apelido" className="rounded-[3px] bg-transparent" placeholder="Apelido da carteira" />
              </div>

              <div className="space-y-1.5">
                <span className="block text-sm text-[#F5F1EB]">Avatar</span>
                <div className="flex items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full border border-[#3F2319] bg-[#2F1D15]">
                    <ImageIcon className="size-5 text-[#D28A4C]" />
                  </div>
                  <Button type="button" size="sm" onClick={outOfScope}>Alterar</Button>
                  <button type="button" onClick={() => setValue('avatarUrl', '')} className="text-sm text-[#F5F1EB] hover:opacity-80">
                    Remover
                  </button>
                </div>
              </div>
            </div>

            <h2 className="mb-4 mt-10 font-bold text-[#F7F3EC]">Alterar senha</h2>
            <div className="max-w-md space-y-5">
              <PasswordField label="Senha atual" id="pf-current" registration={register('currentPassword')} error={formState.errors.currentPassword?.message} />
              <PasswordField label="Nova senha" id="pf-new" registration={register('newPassword')} error={formState.errors.newPassword?.message} />
              <PasswordField label="Confirmar nova senha" id="pf-confirm" registration={register('confirm')} error={formState.errors.confirm?.message} />
            </div>

            <Button type="submit" className="mt-10 px-10 text-[#140D0A]" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? 'Salvando…' : 'Salvar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function PasswordField({ label, id, error, registration }: { label: string; id: string; error?: string; registration: UseFormRegisterReturn }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm text-[#F5F1EB]">{label}</label>
      <div className="relative">
        <Input id={id} type={show ? 'text' : 'password'} autoComplete="off" className="rounded-[3px] bg-transparent pr-10" {...registration} />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={show}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-[#B39463] transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
