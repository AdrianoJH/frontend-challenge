import { AxiosError } from 'axios';
import type { ApiErrorBody, ApiErrorCode } from '@/types';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(code: ApiErrorCode, message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }

  get isRetriable(): boolean {
    return this.code === 'transient' || this.code === 'timeout' || this.status >= 500;
  }

  static fromAxios(error: unknown): ApiError {
    if (error instanceof ApiError) return error;

    if (error instanceof AxiosError) {
      if (error.code === 'ERR_NETWORK' || !error.response) {
        const timedOut = error.code === 'ECONNABORTED';
        return new ApiError(
          timedOut ? 'timeout' : 'transient',
          timedOut ? 'A requisição expirou. Tente novamente.' : 'Falha de conexão com o servidor.',
          0,
        );
      }

      const status = error.response.status;
      const body = error.response.data as Partial<ApiErrorBody> | undefined;
      if (body?.code) {
        return new ApiError(body.code, body.message ?? 'Erro na requisição.', status, body.fields);
      }
      const code = mapStatusToCode(status);
      return new ApiError(code, defaultMessage(code), status);
    }

    return new ApiError('transient', 'Erro inesperado.', 0);
  }
}

function mapStatusToCode(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return 'validation';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 409:
      return 'conflict';
    case 422:
      return 'validation';
    case 429:
      return 'rate_limited';
    default:
      return status >= 500 ? 'transient' : 'transient';
  }
}

function defaultMessage(code: ApiErrorCode): string {
  const messages: Record<ApiErrorCode, string> = {
    validation: 'Dados inválidos.',
    unauthorized: 'Sessão inválida ou expirada.',
    forbidden: 'Você não tem permissão para esta ação.',
    not_found: 'Recurso não encontrado.',
    conflict: 'Conflito ao processar a solicitação.',
    availability: 'Disponibilidade insuficiente.',
    coupon: 'Cupom inválido ou expirado.',
    rate_limited: 'Muitas tentativas. Aguarde um momento.',
    transient: 'Erro temporário no servidor.',
    timeout: 'A requisição expirou.',
  };
  return messages[code];
}
