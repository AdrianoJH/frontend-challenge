import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLogin, useRegister } from '@/features/auth/hooks';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api-error';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().min(1, 'Informe seu e-mail.').email('E-mail inválido.'),
  password: z.string().min(1, 'Informe sua senha.'),
});

const registerSchema = z
  .object({
    name: z.string().min(1, 'Informe seu nome.'),
    email: z.string().min(1, 'Informe seu e-mail.').email('E-mail inválido.'),
    password: z.string().min(8, 'Mínimo de 8 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirme sua senha.'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function AuthModal({
  onClose,
  redirect,
  mode: initialMode = 'login',
}: {
  onClose: () => void;
  redirect?: string;
  mode?: 'login' | 'register';
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const login = useLogin();
  const registerMutation = useRegister();
  const isLogin = mode === 'login';

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  async function onLogin(values: LoginValues) {
    try {
      await login.mutateAsync(values);
      toast({ title: 'Bem-vindo de volta!', variant: 'success' });
      if (redirect) navigate({ to: redirect as '/' });
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'unauthorized') {
          loginForm.setError('password', { message: 'Credenciais inválidas.' });
          toast({ title: 'Credenciais inválidas', description: 'Verifique e-mail e senha.', variant: 'error' });
          return;
        }
        if (error.fields) {
          for (const [field, message] of Object.entries(error.fields)) {
            loginForm.setError(field as keyof LoginValues, { message });
          }
          return;
        }
      }
      toast({ title: 'Não foi possível entrar', description: 'Tente novamente.', variant: 'error' });
    }
  }

  async function onRegister(values: RegisterValues) {
    try {
      await registerMutation.mutateAsync({ name: values.name, email: values.email, password: values.password });
      toast({ title: 'Conta criada com sucesso!', variant: 'success' });
      if (redirect) navigate({ to: redirect as '/' });
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'conflict') {
          registerForm.setError('email', { message: error.fields?.email ?? 'E-mail já cadastrado.' });
          return;
        }
        if (error.fields) {
          for (const [field, message] of Object.entries(error.fields)) {
            registerForm.setError(field as keyof RegisterValues, { message });
          }
          return;
        }
      }
      toast({ title: 'Não foi possível criar a conta', description: 'Tente novamente.', variant: 'error' });
    }
  }

  function handleSocial() {
    toast({ title: 'Fora do escopo', description: 'Login social não faz parte da entrega.' });
  }
  function handleForgot() {
    toast({ title: 'Fora do escopo', description: 'Recuperação de senha não faz parte da entrega.' });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#140D0A]/20 lg:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isLogin ? 'Entrar' : 'Criar conta'}
        onClick={(e) => e.stopPropagation()}
        className="relative flex min-h-full w-full flex-col justify-center bg-[#140D0A] p-6 shadow-2xl shadow-black/40 lg:min-h-[600px] lg:w-[500px] lg:max-w-[calc(100vw-2rem)] lg:justify-start lg:border-b-[10px] lg:border-[#D28A4C] lg:bg-[#241612] lg:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 hidden text-[#D28A4C] transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:block"
        >
          <X className="size-5" />
        </button>

        <div className="mb-10 text-center text-[#F5F1EB] lg:hidden">
          <p className="text-3xl font-bold tracking-[0.25em]">KURIO</p>
          <h2 className="mt-10 text-xl font-bold">{isLogin ? 'Entrar' : 'Criar conta'}</h2>
        </div>

        <div className="hidden items-center justify-center gap-3 text-lg lg:flex">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={cn('font-semibold outline-none transition-colors', isLogin ? 'text-primary' : 'text-[#F5F1EB] hover:text-primary')}
          >
            Entrar
          </button>
          <span className="text-[#F0805F]" aria-hidden="true">|</span>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={cn('font-semibold outline-none transition-colors', !isLogin ? 'text-primary' : 'text-[#F5F1EB] hover:text-primary')}
          >
            Criar conta
          </button>
        </div>

        <p className="mt-3 hidden text-center text-sm text-[#F5F1EB] lg:block">
          {isLogin
            ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.'
            : 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'}
        </p>

        {isLogin ? (
          <form onSubmit={loginForm.handleSubmit(onLogin)} noValidate className="space-y-4 lg:mt-6">
            <Field error={loginForm.formState.errors.email?.message} id="login-email">
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="contato@email.com"
                aria-label="E-mail"
                aria-invalid={loginForm.formState.errors.email ? true : undefined}
                {...loginForm.register('email')}
              />
            </Field>

            <Field error={loginForm.formState.errors.password?.message} id="login-password">
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="***********"
                  className="pr-10 text-[#F5F1EB] placeholder:text-[#F5F1EB]"
                  aria-label="Senha"
                  aria-invalid={loginForm.formState.errors.password ? true : undefined}
                  {...loginForm.register('password')}
                />
                <PasswordToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
              </div>
            </Field>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgot}
                className="rounded-sm text-sm font-normal text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Esqueceu a senha?
              </button>
            </div>

            <Button type="submit" className="h-[60px] w-full" disabled={loginForm.formState.isSubmitting}>
              {loginForm.formState.isSubmitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        ) : (
          <form onSubmit={registerForm.handleSubmit(onRegister)} noValidate className="space-y-4 lg:mt-6">
            <Field error={registerForm.formState.errors.name?.message} id="reg-name">
              <Input id="reg-name" autoComplete="name" placeholder="Nome de usuário" aria-label="Nome de usuário" aria-invalid={registerForm.formState.errors.name ? true : undefined} {...registerForm.register('name')} />
            </Field>

            <Field error={registerForm.formState.errors.email?.message} id="reg-email">
              <Input id="reg-email" type="email" autoComplete="email" placeholder="Digite seu e-mail" aria-label="E-mail" aria-invalid={registerForm.formState.errors.email ? true : undefined} {...registerForm.register('email')} />
            </Field>

            <Field error={registerForm.formState.errors.password?.message} id="reg-password">
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Senha"
                  className="pr-10 text-[#F5F1EB]"
                  aria-label="Senha"
                  {...registerForm.register('password')}
                />
                <PasswordToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
              </div>
            </Field>

            <Field error={registerForm.formState.errors.confirmPassword?.message} id="reg-confirm">
              <div className="relative">
                <Input
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Confirmar senha"
                  className="pr-10 text-[#F5F1EB]"
                  aria-label="Confirmar senha"
                  {...registerForm.register('confirmPassword')}
                />
                <PasswordToggle show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
              </div>
            </Field>

            <Button type="submit" className="h-[60px] w-full" disabled={registerForm.formState.isSubmitting}>
              {registerForm.formState.isSubmitting ? 'Criando…' : 'Criar conta'}
            </Button>
          </form>
        )}

        <div className="my-6 flex items-center gap-3 text-xs text-[#F5F1EB] lg:-mx-8">
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
          <span>Ou continue com</span>
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
        </div>

        <div className="space-y-3">
          <Button type="button" variant="outline" className="w-full" onClick={handleSocial}>
            <GoogleIcon />
            Continuar com Google
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={handleSocial}>
            <FacebookIcon />
            Continuar com Facebook
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-[#CFB28C] lg:hidden">
          {isLogin ? 'Novo na Kurio? ' : 'Já tem uma conta? '}
          <button
            type="button"
            onClick={() => setMode(isLogin ? 'register' : 'login')}
            className="text-[#CFB28C] underline-offset-4 hover:underline"
          >
            {isLogin ? 'Crie uma conta' : 'Entre'}
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({ id, error, children }: { id: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
      aria-pressed={show}
      className="absolute inset-y-0 right-0 flex items-center px-3 text-[#55321F] transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="#1877F2" aria-hidden="true">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.01 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.25h3.32l-.53 3.49h-2.79V24C19.61 23.08 24 18.09 24 12.07Z" />
    </svg>
  );
}
