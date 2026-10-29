import { HttpResponse } from 'msw';
import { db } from '../db';
import { getScenario } from '../scenarios';
import type { ApiErrorBody, User } from '@/types';
import type { SeedUser } from '../data/fixtures';

export function now(): number {
  return Date.now();
}

export function error(status: number, body: ApiErrorBody) {
  return HttpResponse.json(body, { status });
}

export function publicUser(user: SeedUser | User): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

export function bearer(request: Request): string | null {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}

export interface AuthContext {
  userId: string;
  token: string;
}

export function requireAuth(request: Request): AuthContext | Response {
  const token = bearer(request);
  const { flags } = getScenario();
  if (flags.forceSessionExpired) {
    if (token) db.revokeSession(token);
  }
  const session = db.getSession(token, now());
  if (!session) {
    return error(401, { code: 'unauthorized', message: 'Sessão inválida ou expirada.' });
  }
  return { userId: session.userId, token: session.token };
}

export function isAuthResponse(value: AuthContext | Response): value is Response {
  return value instanceof Response;
}

export function cartOwnerKey(request: Request): string {
  const token = bearer(request);
  const session = db.getSession(token, now());
  if (session) return session.userId;
  const visitorId = request.headers.get('X-Visitor-Id') ?? 'anonymous';
  return `visitor:${visitorId}`;
}
