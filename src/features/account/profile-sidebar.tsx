import { Link } from '@tanstack/react-router';
import { Activity, Download, Headphones, Heart, LogOut, Tag, User, Wallet } from 'lucide-react';
import { useLogout } from '@/features/auth/hooks';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

export function ProfileSidebar({ active }: { active: 'Dados do perfil' | 'Carteiras' }) {
  const logout = useLogout();
  const { toast } = useToast();
  const outOfScope = () => toast({ title: 'Fora do escopo', description: 'Esta área não faz parte da entrega.' });

  const MENU = [
    { label: 'Dados do perfil', icon: User, to: '/profile' as const },
    { label: 'Carteiras', icon: Wallet, to: '/wallets' as const },
    { label: 'Atividade', icon: Activity },
    { label: 'Lista de interesse', icon: Heart },
    { label: 'Ofertas', icon: Tag },
    { label: 'Arquivos baixados', icon: Download },
    { label: 'Suporte', icon: Headphones },
    { label: 'Sair', icon: LogOut, action: () => logout.mutate() },
  ];

  return (
    <aside>
      <div className="bg-[#241612] p-5">
        <h2 className="mb-4 text-base font-bold text-[#F7F3EC]">Meu perfil</h2>
        <nav className="space-y-1">
          {MENU.map((item) => {
            const isActive = item.label === active;
            const isSair = item.label === 'Sair';
            const base = 'flex w-full items-center gap-3 border-l-2 border-l-transparent py-2 pl-4 text-sm text-[#E89B55] transition-colors';
            const classes = cn(base, isActive && 'border-l-[#D28A4C]', isSair && 'font-bold');
            const inner = (
              <>
                <item.icon className={cn('size-4 shrink-0', isActive ? 'text-[#D28A4C]' : 'text-[#B39463]')} />
                {item.label}
              </>
            );
            const el = item.to ? (
              <Link key={item.label} to={item.to} className={classes}>{inner}</Link>
            ) : (
              <button key={item.label} type="button" onClick={item.action ?? outOfScope} className={classes}>{inner}</button>
            );
            if (isSair) {
              return (
                <div key={item.label} className="mt-1">
                  <div className="-mx-5 mb-2 border-t border-[#3F2319]" aria-hidden />
                  {el}
                </div>
              );
            }
            return el;
          })}
        </nav>
      </div>
    </aside>
  );
}
