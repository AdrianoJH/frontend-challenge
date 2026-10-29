import { useSyncExternalStore } from 'react';

// mobile = abaixo do breakpoint lg do Tailwind (1024px)
const QUERY = '(max-width: 1023px)';

function subscribe(callback: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

// no servidor assume desktop (não há window)
function getServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
