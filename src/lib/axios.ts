import axios from 'axios';
import { env } from './env';
import { ApiError } from './api-error';
import { getToken, notifyUnauthorized } from './auth-token';
import { getVisitorId } from './visitor';

export const api = axios.create({
  baseURL: env.apiUrl,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['X-Visitor-Id'] = getVisitorId();
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = ApiError.fromAxios(error);
    if (apiError.code === 'unauthorized') {
      notifyUnauthorized();
    }
    return Promise.reject(apiError);
  },
);
