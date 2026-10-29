import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { applyNetwork } from '../network';
import { env } from '@/lib/env';
import { bearer, error, now, publicUser } from './_util';
import type { Credentials, RegisterInput, Session } from '@/types';

const base = env.apiUrl;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function sessionPayload(userId: string): Session {
  const session = db.issueSession(userId, now());
  const user = db.findUserById(userId)!;
  return { token: session.token, user: publicUser(user), expiresAt: session.expiresAt };
}

export const authHandlers = [
  http.post(`${base}/auth/register`, async ({ request }) => {
    const net = await applyNetwork();
    if (net) return net;

    const body = (await request.json()) as RegisterInput;
    const fields: Record<string, string> = {};
    if (!body.name?.trim()) fields.name = 'Informe seu nome.';
    if (!EMAIL_RE.test(body.email ?? '')) fields.email = 'E-mail inválido.';
    if (!body.password || body.password.length < 8) fields.password = 'Mínimo de 8 caracteres.';
    if (Object.keys(fields).length) {
      return error(422, { code: 'validation', message: 'Verifique os campos.', fields });
    }
    if (db.findUserByEmail(body.email)) {
      return error(409, { code: 'conflict', message: 'E-mail já cadastrado.', fields: { email: 'E-mail já cadastrado.' } });
    }

    const user = db.createUser({ email: body.email, password: body.password, name: body.name }, now());

    const visitorId = request.headers.get('X-Visitor-Id');
    if (visitorId) db.mergeCart(`visitor:${visitorId}`, user.id, now());

    return HttpResponse.json(sessionPayload(user.id), { status: 201 });
  }),

  http.post(`${base}/auth/login`, async ({ request }) => {
    const net = await applyNetwork();
    if (net) return net;

    const body = (await request.json()) as Credentials;
    const user = db.findUserByEmail(body.email ?? '');
    if (!user || user.password !== body.password) {
      return error(401, { code: 'unauthorized', message: 'Credenciais inválidas.' });
    }

    const visitorId = request.headers.get('X-Visitor-Id');
    if (visitorId) db.mergeCart(`visitor:${visitorId}`, user.id, now());

    return HttpResponse.json(sessionPayload(user.id));
  }),

  http.get(`${base}/auth/session`, async ({ request }) => {
    const net = await applyNetwork();
    if (net) return net;

    const session = db.getSession(bearer(request), now());
    if (!session) return error(401, { code: 'unauthorized', message: 'Sessão inválida ou expirada.' });
    const user = db.findUserById(session.userId)!;
    return HttpResponse.json({ token: session.token, user: publicUser(user), expiresAt: session.expiresAt });
  }),

  http.post(`${base}/auth/logout`, async ({ request }) => {
    const net = await applyNetwork();
    if (net) return net;

    const token = bearer(request);
    if (token) db.revokeSession(token);
    return new HttpResponse(null, { status: 204 });
  }),
];
