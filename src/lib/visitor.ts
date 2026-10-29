const KEY = 'nftm.visitor';

function generate(): string {
  return `v-${Date.now().toString(36)}-${(performance.now() | 0).toString(36)}`;
}

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = generate();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'anonymous';
  }
}
