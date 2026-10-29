export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? '/api',
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? '/',
  enableMocks: (import.meta.env.VITE_ENABLE_MOCKS ?? 'true') === 'true',
  mockScenario: import.meta.env.VITE_MOCK_SCENARIO ?? 'default',
} as const;
