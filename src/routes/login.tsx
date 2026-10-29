import { createFileRoute } from '@tanstack/react-router';
import { AuthModal } from '@/features/auth/auth-modal';

export const Route = createFileRoute('/login')({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } =>
    typeof s.redirect === 'string' ? { redirect: s.redirect } : {},
  component: LoginPage,
});

function LoginPage() {
  const navigate = Route.useNavigate();
  const { redirect } = Route.useSearch();
  return <AuthModal mode="login" onClose={() => navigate({ to: '/' })} redirect={redirect} />;
}
