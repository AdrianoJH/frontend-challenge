import { redirect } from '@tanstack/react-router';
import { getToken } from './auth-token';

export function requireAuth(href: string): void {
  if (!getToken()) {
    throw redirect({ to: '/login', search: { redirect: href } });
  }
}
