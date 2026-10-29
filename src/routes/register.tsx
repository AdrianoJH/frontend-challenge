import { createFileRoute } from '@tanstack/react-router';
import { AuthModal } from '@/features/auth/auth-modal';

export const Route = createFileRoute('/register')({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = Route.useNavigate();
  return <AuthModal mode="register" onClose={() => navigate({ to: '/' })} />;
}
