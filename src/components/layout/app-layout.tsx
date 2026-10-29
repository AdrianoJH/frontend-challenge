import { useState, type ComponentType, type ReactNode } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import {
  Facebook,
  Heart,
  Instagram,
  Linkedin,
  LogIn,
  Search,
  ShoppingCart,
  Twitter,
  User as UserIcon,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/auth';
import { useLogout } from '@/features/auth/hooks';
import { AuthModal } from '@/features/auth/auth-modal';
import { useCart } from '@/features/cart/hooks';
import { useRealtime } from '@/realtime/realtime';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Início', kind: 'home' as const },
  { label: 'Mercado', kind: 'link' as const },
  { label: 'Criadores', kind: 'scope' as const },
  { label: 'Aprenda', kind: 'scope' as const },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [loginOpen, setLoginOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <Header onOpenLogin={() => setLoginOpen(true)} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <BottomNav />
      {loginOpen && <AuthModal onClose={() => setLoginOpen(false)} />}
    </div>
  );
}

function Header({ onOpenLogin }: { onOpenLogin: () => void }) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { data: cart } = useCart();
  const logout = useLogout();
  const { isConnected } = useRealtime();
  const { toast } = useToast();
  const [searchOpen, setSearchOpen] = useState(false);

  const cartCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onMarket = pathname.startsWith('/nfts') || pathname.startsWith('/cart') || pathname.startsWith('/checkout');

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get('q')?.toString() ?? '';
    navigate({ to: '/', search: (prev) => ({ ...prev, q: q || undefined, page: undefined }) });
    setSearchOpen(false);
  }

  function outOfScope() {
    toast({ title: 'Seção fora do escopo', description: 'Esta área não faz parte da entrega do desafio.' });
  }

  return (
    <header className="sticky top-0 z-40 hidden bg-background/85 backdrop-blur-xl lg:block">
      <div className="mx-auto w-full max-w-[1440px] px-6 sm:px-10 lg:px-16">
        <div className="flex h-16 items-center gap-4 border-b border-border/70">
        <Link to="/" className="text-lg font-bold tracking-[0.25em]">
          KURIO
        </Link>

        <nav className="hidden h-16 flex-1 items-stretch justify-center gap-8 md:flex" aria-label="Principal">
          {NAV.map((item, i) =>
            item.kind === 'home' ? (
              <Link
                key={i}
                to="/"
                activeOptions={{ exact: true, includeSearch: false }}
                className="relative flex items-center text-sm font-medium text-foreground transition-colors hover:text-accent"
                activeProps={{
                  className:
                    'font-semibold !text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-accent after:content-[""]',
                }}
              >
                {item.label}
              </Link>
            ) : item.kind === 'link' ? (
              <Link
                key={i}
                to="/"
                className={cn(
                  'relative flex items-center text-sm font-medium transition-colors hover:text-accent',
                  onMarket
                    ? 'font-semibold text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-accent after:content-[""]'
                    : 'text-foreground',
                )}
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={i}
                onClick={outOfScope}
                className="flex items-center text-sm font-medium text-foreground transition-colors hover:text-accent"
              >
                {item.label}
              </button>
            ),
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {searchOpen ? (
            <form onSubmit={onSearch} role="search" className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" type="search" autoFocus placeholder="Buscar NFTs…" aria-label="Buscar" className="w-56 pl-9" onBlur={() => setSearchOpen(false)} />
            </form>
          ) : (
            <Button variant="ghost" size="icon" aria-label="Buscar" className="hidden sm:inline-flex" onClick={() => setSearchOpen(true)}>
              <Search className="size-5" />
            </Button>
          )}

          <span
            className="hidden items-center sm:flex"
            data-testid="realtime-status"
            data-connected={isConnected}
            title={isConnected ? 'Tempo real conectado' : 'Tempo real desconectado'}
          >
            {isConnected ? <Wifi className="size-4 text-success" /> : <WifiOff className="size-4 text-destructive" />}
            <span className="sr-only">{isConnected ? 'Conectado' : 'Desconectado'}</span>
          </span>

          <Button variant="ghost" size="icon" asChild className="relative">
            <Link to="/cart" aria-label={`Carrinho com ${cartCount} itens`}>
              <ShoppingCart className="size-5" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Link>
          </Button>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu da conta">
                  <Avatar className="size-8">
                    <AvatarImage src={user?.avatarUrl} alt="" />
                    <AvatarFallback>{user?.name?.[0] ?? 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="truncate">{user?.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">Perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/wallets">Carteiras</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => logout.mutate()}>Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={onOpenLogin} className="hidden gap-2 sm:inline-flex">
              <LogIn className="size-4" /> Entrar
            </Button>
          )}
        </div>
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  const { isAuthenticated } = useAuth();
  const left = [
    { to: '/' as const, label: 'Início', icon: HouseSolid },
    { to: '/profile' as const, label: 'Favoritos', icon: Heart },
  ];
  const right = [
    { to: '/cart' as const, label: 'Carrinho', icon: ShoppingCart },
    { to: (isAuthenticated ? '/profile' : '/login') as '/profile' | '/login', label: 'Conta', icon: UserIcon },
  ];
  const item = (it: { to: '/' | '/profile' | '/cart' | '/login'; label: string; icon: ComponentType<{ className?: string }> }) => (
    <Link
      key={it.label}
      to={it.to}
      className="flex flex-1 flex-col items-center justify-center text-[#CFB28C] aria-[current=page]:text-[#E89B55]"
      aria-label={it.label}
    >
      <it.icon className="size-5 fill-current" />
      <span className="sr-only">{it.label}</span>
    </Link>
  );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 h-[95px] lg:hidden" aria-label="Navegação">
      {/* preserveAspectRatio=none deixa o entalhe do FAB esticar na largura sem deformar a altura */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 390 95"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M0 28 Q0 0 28 0 L117 0 A 36 36 0 0 1 150 23 A 48 48 0 0 0 240 23 A 36 36 0 0 1 273 0 L362 0 Q390 0 390 28 L390 95 L0 95 Z"
          fill="#241612"
        />
      </svg>

      <Link
        to="/"
        aria-label="Explorar"
        className="absolute left-1/2 top-[10px] grid size-[65px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full shadow-lg shadow-black/40"
        style={{ background: 'linear-gradient(180deg, rgba(210, 138, 76, 0.4) -16.92%, #D28A4C 109.23%)' }}
      >
        <img src="/images/nav-center.svg" alt="" className="w-7" />
      </Link>

      <div className="absolute inset-0 flex items-center">
        {left.map(item)}
        <div className="w-16 shrink-0" aria-hidden />
        {right.map(item)}
      </div>
    </nav>
  );
}

function Footer() {
  const { toast } = useToast();
  const features = [
    { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
    { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
    { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
  ];

  function newsletter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    toast({ title: 'Recurso ilustrativo', description: 'A newsletter não faz parte do escopo da entrega.' });
  }

  const socials = [
    { Icon: Facebook, outline: false },
    { Icon: Instagram, outline: true },
    { Icon: Twitter, outline: false },
    { Icon: Linkedin, outline: false },
    { Icon: YoutubeSolid, outline: true },
  ];
  const divider =
    "relative before:absolute before:left-4 before:right-4 before:top-0 before:h-[1.5px] before:bg-[#D28A4C] before:content-[''] lg:before:left-0 lg:before:right-auto lg:before:bottom-10 lg:before:top-10 lg:before:h-auto lg:before:w-[1.5px]";

  return (
    <footer className="mt-16 pb-32 lg:pb-0">
      <div className="mx-auto w-full max-w-[1440px] px-6 sm:px-10 lg:px-16">
        <div className="overflow-hidden bg-[#241612]">
          <div className="flex flex-col lg:flex-row">
            {features.map((f, i) => (
              <div key={f.letter} className={cn('flex-1 py-10', i === 0 ? 'px-4 lg:pl-8 lg:pr-4' : 'px-4', i > 0 && divider)}>
                <div className="mb-4 grid size-[74px] place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  {f.letter}
                </div>
                <h3 className="mb-2 text-base font-bold">{f.title}</h3>
                <p className="text-xs leading-relaxed text-[#CFB28C]">{f.text}</p>
              </div>
            ))}
            <div className={cn('py-10 pl-4 pr-8 lg:w-[360px]', divider)}>
              <h3 className="mb-4 font-bold">Antecipe-se ao próximo lançamento</h3>
              <form onSubmit={newsletter} className="flex items-stretch overflow-hidden rounded-md border-2 border-[#D28A4C]">
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="digite seu e-mail..."
                  aria-label="E-mail para newsletter"
                  className="min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-xs placeholder:text-[#B39463]"
                />
                <Button type="submit" className="rounded-none text-[#140D0A]">Enviar</Button>
              </form>
              <p className="mt-3 text-xs leading-relaxed text-[#CFB28C]">
                Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start justify-center gap-1 bg-[#38220F] px-8 py-4 text-sm text-[#F5F1EB] sm:h-[88px] sm:flex-row sm:items-center sm:justify-between sm:py-0 lg:grid lg:grid-cols-4 lg:gap-8">
            <span className="font-bold tracking-[0.2em]">KURIO</span>
            <span>Feito para colecionadores, criadores e cultura</span>
            <span>contato@email.com</span>
            <span>+55 11 4002 8922</span>
          </div>

          <div className="grid gap-8 px-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
            <FooterCol
              title="Meu perfil"
              onScope={() => toast({ title: 'Fora do escopo', description: 'Área não incluída na entrega.' })}
              links={[['Meu perfil', '/profile'], ['Minha coleção', '/profile'], ['Atividade'], ['Estúdio do criador'], ['Lista de interesse', '/profile']]}
            />
            <FooterCol
              title="Central de ajuda"
              onScope={() => toast({ title: 'Fora do escopo', description: 'Área não incluída na entrega.' })}
              links={[['Central de ajuda'], ['Como comprar NFTs'], ['Carteira e segurança'], ['Política do mercado'], ['Denunciar item']]}
            />
            <FooterCol
              title="Coleções"
              links={[
                ['Arte digital', '/', { categories: 'art' }],
                ['Fotografia', '/', { categories: 'photography' }],
                ['Música', '/', { categories: 'music' }],
                ['Arte 3D', '/', { categories: 'gaming' }],
                ['Utilidade', '/', { categories: 'utility' }],
              ]}
            />
            <div>
              <h4 className="mb-3 text-lg font-bold">Redes sociais</h4>
              <div className="flex gap-2">
                {socials.map(({ Icon, outline }, i) => (
                  <button
                    key={i}
                    onClick={() => toast({ title: 'Link externo simulado' })}
                    className="grid size-9 place-items-center rounded-md border-[1.5px] border-[#D28A4C] text-[#D28A4C] transition-colors hover:bg-[#38220F]"
                    aria-label="Rede social"
                  >
                    <Icon className={cn('size-4', !outline && 'fill-current')} />
                  </button>
                ))}
              </div>
              <h4 className="mb-2 mt-5 text-lg font-bold">Carteiras compatíveis</h4>
              <div className="inline-flex items-center rounded-md border border-[#D28A4C] bg-[#38220F] px-3 py-1.5 text-[10px] font-medium tracking-wide text-[#D28A4C]">
                {['METAMASK', 'WALLETCONNECT', 'COINBASE'].map((w, i) => (
                  <span key={w} className="flex items-center">
                    {i > 0 && <span className="mx-1.5 text-base leading-none">·</span>}
                    {w}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="py-6 text-center text-xs text-[#F5F1EB]">© 2026 Kurio. Propriedade digital para todos.</p>
      </div>
    </footer>
  );
}

function HouseSolid({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2.8 2.5 11.2V20.5a.5.5 0 0 0 .5.5h18a.5.5 0 0 0 .5-.5V11.2z" />
      <path d="M9.75 21v-5.25a2.25 2.25 0 0 1 4.5 0V21z" fill="#241612" />
    </svg>
  );
}

// a lucide só tem o YouTube em outline, então desenhamos a versão preenchida à mão
function YoutubeSolid({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.45A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.95 1.97C5.12 19.5 12 19.5 12 19.5s6.88 0 8.59-.45a2.78 2.78 0 0 0 1.95-1.97 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" />
      <path d="M9.75 15.02V8.48l5.75 3.27-5.75 3.27z" fill="#241612" />
    </svg>
  );
}

type FooterLink = [label: string, to?: string, search?: Record<string, string>];

function FooterCol({ title, links, onScope }: { title: string; links: FooterLink[]; onScope?: () => void }) {
  return (
    <div>
      <h4 className="mb-3 text-lg font-bold">{title}</h4>
      <ul className="space-y-2 text-sm font-normal text-[#F5F1EB]">
        {links.map(([label, to, search], i) => (
          <li key={i}>
            {to ? (
              <Link to={to as '/'} search={search as never} className="hover:text-primary">
                {label}
              </Link>
            ) : (
              <button onClick={onScope} className="hover:text-primary">
                {label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
