import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { applyNetwork } from '../network';
import { env } from '@/lib/env';
import { error, isAuthResponse, publicUser, requireAuth } from './_util';
import type { PasswordChangeInput, ProfileInput } from '@/types';

const base = env.apiUrl;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const profileHandlers = [
  http.get(`${base}/profile`, async ({ request }) => {
    const net = await applyNetwork();
    if (net) return net;
    const auth = requireAuth(request);
    if (isAuthResponse(auth)) return auth;
    return HttpResponse.json(publicUser(db.findUserById(auth.userId)!));
  }),

  http.patch(`${base}/profile`, async ({ request }) => {
    const net = await applyNetwork();
    if (net) return net;
    const auth = requireAuth(request);
    if (isAuthResponse(auth)) return auth;

    const body = (await request.json()) as ProfileInput;
    const fields: Record<string, string> = {};
    if (!body.name?.trim()) fields.name = 'Informe seu nome.';
    if (!EMAIL_RE.test(body.email ?? '')) fields.email = 'E-mail inválido.';
    if (Object.keys(fields).length) {
      return error(422, { code: 'validation', message: 'Verifique os campos.', fields });
    }
    const other = db.findUserByEmail(body.email);
    if (other && other.id !== auth.userId) {
      return error(409, { code: 'conflict', message: 'E-mail já em uso.', fields: { email: 'E-mail já em uso.' } });
    }
    const user = db.updateProfile(auth.userId, body)!;
    return HttpResponse.json(publicUser(user));
  }),

  http.post(`${base}/profile/password`, async ({ request }) => {
    const net = await applyNetwork();
    if (net) return net;
    const auth = requireAuth(request);
    if (isAuthResponse(auth)) return auth;

    const body = (await request.json()) as PasswordChangeInput;
    const fields: Record<string, string> = {};
    if (!body.newPassword || body.newPassword.length < 8) fields.newPassword = 'Mínimo de 8 caracteres.';
    if (Object.keys(fields).length) {
      return error(422, { code: 'validation', message: 'Verifique os campos.', fields });
    }
    const result = db.changePassword(auth.userId, body.currentPassword, body.newPassword);
    if (result === 'wrong') {
      return error(422, { code: 'validation', message: 'Senha atual incorreta.', fields: { currentPassword: 'Senha atual incorreta.' } });
    }
    return new HttpResponse(null, { status: 204 });
  }),
];
