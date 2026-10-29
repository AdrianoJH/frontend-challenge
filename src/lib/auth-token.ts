const STORAGE_KEY = 'nftm.token';

let token: string | null = readInitial();
const unauthorizedHandlers = new Set<() => void>();

function readInitial(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return token;
}

export function setToken(next: string | null): void {
  token = next;
  try {
    if (next) localStorage.setItem(STORAGE_KEY, next);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // sem storage, mantém só em memória
  }
}

export function onUnauthorized(handler: () => void): () => void {
  unauthorizedHandlers.add(handler);
  return () => unauthorizedHandlers.delete(handler);
}

export function notifyUnauthorized(): void {
  unauthorizedHandlers.forEach((h) => h());
}
