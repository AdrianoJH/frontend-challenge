import {
  buildCoupons,
  buildNfts,
  buildUsers,
  buildWallets,
  type Coupon,
  type SeedUser,
} from './data/fixtures';
import { addEth, cmpEth, mulEth, subEth, sumEth, toWei, fromWei } from '@/lib/money';
import type {
  Cart,
  CartItem,
  ChainId,
  CreateOrderInput,
  Nft,
  NftListParams,
  Order,
  Paginated,
  Quote,
  QuoteInput,
  Wallet,
  WalletInput,
} from '@/types';

type DbEvents = {
  'nft.updated': { id: string; price: string; editionsAvailable: number; version: number };
  'order.updated': { userId: string; order: Order };
};

type Listener<E extends keyof DbEvents> = (payload: DbEvents[E]) => void;

interface Session {
  token: string;
  userId: string;
  expiresAt: string;
}

interface DbState {
  nfts: Nft[];
  users: SeedUser[];
  coupons: Coupon[];
  sessions: Session[];
  favorites: Record<string, string[]>;
  carts: Record<string, Cart>;
  orders: Record<string, Order[]>;
  ordersByIdem: Record<string, { userId: string; orderId: string; payloadHash: string }>;
  wallets: Record<string, Wallet[]>;
}

const DB_KEY = 'nftm.db.v1';
const SESSION_TTL_MS = 30 * 60_000;
const NETWORK_FEE: Record<ChainId, string> = {
  ethereum: '0.004',
  polygon: '0.0008',
  solana: '0.0005',
};

function nowIso(ts: number): string {
  return new Date(ts).toISOString();
}

let seq = 1000;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq.toString(36)}${(seq * 2654435761 % 0xffffff).toString(16)}`;
}

function hashPayload(obj: unknown): string {
  const s = JSON.stringify(obj);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

class MockDb {
  private state!: DbState;
  private listeners: { [E in keyof DbEvents]: Set<Listener<E>> } = {
    'nft.updated': new Set(),
    'order.updated': new Set(),
  };

  constructor() {
    this.state = this.load() ?? this.seed();
  }

  private seed(): DbState {
    return {
      nfts: buildNfts(),
      users: buildUsers(),
      coupons: buildCoupons(),
      sessions: [],
      favorites: {},
      carts: {},
      orders: {},
      ordersByIdem: {},
      wallets: buildWallets(),
    };
  }

  private load(): DbState | null {
    try {
      const raw = localStorage.getItem(DB_KEY);
      return raw ? (JSON.parse(raw) as DbState) : null;
    } catch {
      return null;
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(this.state));
    } catch {
      /* ignore */
    }
  }

  reset(): void {
    this.state = this.seed();
    this.persist();
  }

  on<E extends keyof DbEvents>(event: E, listener: Listener<E>): () => void {
    this.listeners[event].add(listener);
    return () => this.listeners[event].delete(listener);
  }

  private emit<E extends keyof DbEvents>(event: E, payload: DbEvents[E]): void {
    this.listeners[event].forEach((l) => l(payload));
  }

  findUserByEmail(email: string): SeedUser | undefined {
    return this.state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id: string): SeedUser | undefined {
    return this.state.users.find((u) => u.id === id);
  }

  createUser(input: { email: string; password: string; name: string }, ts: number): SeedUser {
    const user: SeedUser = {
      id: nextId('user'),
      email: input.email,
      password: input.password,
      name: input.name,
      avatarUrl: `/art/${nextId('avatar')}.svg`,
      createdAt: nowIso(ts),
    };
    this.state.users.push(user);
    this.persist();
    return user;
  }

  issueSession(userId: string, ts: number): Session {
    const session: Session = {
      token: nextId('tok'),
      userId,
      expiresAt: nowIso(ts + SESSION_TTL_MS),
    };
    this.state.sessions.push(session);
    this.persist();
    return session;
  }

  getSession(token: string | null, ts: number): Session | null {
    if (!token) return null;
    const session = this.state.sessions.find((s) => s.token === token);
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() <= ts) {
      this.revokeSession(token);
      return null;
    }
    return session;
  }

  revokeSession(token: string): void {
    this.state.sessions = this.state.sessions.filter((s) => s.token !== token);
    this.persist();
  }

  expireAllSessionsFor(userId: string): void {
    this.state.sessions = this.state.sessions.filter((s) => s.userId !== userId);
    this.persist();
  }

  updateProfile(userId: string, patch: { name?: string; email?: string; avatarUrl?: string }): SeedUser | undefined {
    const user = this.findUserById(userId);
    if (!user) return undefined;
    if (patch.name !== undefined) user.name = patch.name;
    if (patch.email !== undefined) user.email = patch.email;
    if (patch.avatarUrl !== undefined) user.avatarUrl = patch.avatarUrl;
    this.persist();
    return user;
  }

  changePassword(userId: string, current: string, next: string): 'ok' | 'wrong' {
    const user = this.findUserById(userId);
    if (!user || user.password !== current) return 'wrong';
    user.password = next;
    this.persist();
    return 'ok';
  }

  getNft(idOrSlug: string): Nft | undefined {
    return this.state.nfts.find((n) => n.id === idOrSlug || n.slug === idOrSlug);
  }

  listNfts(params: NftListParams): Paginated<Nft> {
    let items = [...this.state.nfts];
    const { q, categories, chains, minPrice, maxPrice, sort, availableOnly } = params;

    if (q) {
      const needle = q.toLowerCase();
      items = items.filter(
        (n) =>
          n.name.toLowerCase().includes(needle) ||
          n.collection.toLowerCase().includes(needle) ||
          n.creator.name.toLowerCase().includes(needle),
      );
    }
    if (categories?.length) items = items.filter((n) => categories.includes(n.category));
    if (chains?.length) items = items.filter((n) => chains.includes(n.chain));
    if (minPrice) items = items.filter((n) => cmpEth(n.price, minPrice) >= 0);
    if (maxPrice) items = items.filter((n) => cmpEth(n.price, maxPrice) <= 0);
    if (availableOnly) items = items.filter((n) => n.editionsAvailable > 0);

    switch (sort) {
      case 'price_asc':
        items.sort((a, b) => cmpEth(a.price, b.price));
        break;
      case 'price_desc':
        items.sort((a, b) => cmpEth(b.price, a.price));
        break;
      case 'popular':
        items.sort((a, b) => b.likes - a.likes);
        break;
      case 'recent':
      default:
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
    }

    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(48, Math.max(1, params.pageSize ?? 12));
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      page,
      pageSize,
      total,
      totalPages,
    };
  }

  featuredNfts(): Nft[] {
    return this.state.nfts.filter((n) => n.featured);
  }

  updateNft(id: string, patch: { price?: string; editionsAvailable?: number }): Nft | undefined {
    const nft = this.state.nfts.find((n) => n.id === id);
    if (!nft) return undefined;
    if (patch.price !== undefined) nft.price = patch.price;
    if (patch.editionsAvailable !== undefined) nft.editionsAvailable = patch.editionsAvailable;
    nft.version += 1;
    // mantem o snapshot do carrinho em dia pra detectar mudança
    for (const cart of Object.values(this.state.carts)) {
      const line = cart.items.find((i) => i.nftId === id);
      if (line) {
        line.nft = { ...line.nft, price: nft.price, editionsAvailable: nft.editionsAvailable, version: nft.version };
        cart.version += 1;
      }
    }
    this.persist();
    this.emit('nft.updated', {
      id: nft.id,
      price: nft.price,
      editionsAvailable: nft.editionsAvailable,
      version: nft.version,
    });
    return nft;
  }

  getFavorites(userId: string): string[] {
    return this.state.favorites[userId] ?? [];
  }

  addFavorite(userId: string, nftId: string): string[] {
    const list = this.getFavorites(userId);
    if (!list.includes(nftId)) list.push(nftId);
    this.state.favorites[userId] = list;
    this.persist();
    return list;
  }

  removeFavorite(userId: string, nftId: string): string[] {
    this.state.favorites[userId] = this.getFavorites(userId).filter((id) => id !== nftId);
    this.persist();
    return this.state.favorites[userId];
  }

  private emptyCart(): Cart {
    return { id: nextId('cart'), items: [], version: 1, updatedAt: nowIso(0) };
  }

  getCart(ownerKey: string): Cart {
    if (!this.state.carts[ownerKey]) this.state.carts[ownerKey] = this.emptyCart();
    return this.state.carts[ownerKey];
  }

  mergeCart(visitorKey: string, userId: string, ts: number): Cart {
    const visitor = this.state.carts[visitorKey];
    this.getCart(userId);
    if (visitor && visitor.items.length) {
      for (const item of visitor.items) {
        this.upsertCartItem(userId, item.nftId, item.quantity, ts, true);
      }
      delete this.state.carts[visitorKey];
      this.persist();
    }
    return this.getCart(userId);
  }

  private snapshot(nft: Nft): CartItem['nft'] {
    return {
      id: nft.id,
      slug: nft.slug,
      name: nft.name,
      imageUrl: nft.imageUrl,
      chain: nft.chain,
      price: nft.price,
      editionsAvailable: nft.editionsAvailable,
      version: nft.version,
    };
  }

  upsertCartItem(ownerKey: string, nftId: string, quantity: number, ts: number, additive = false): Cart | 'not_found' | 'unavailable' {
    const nft = this.getNft(nftId);
    if (!nft) return 'not_found';
    const cart = this.getCart(ownerKey);
    const existing = cart.items.find((i) => i.nftId === nftId);
    const target = additive && existing ? existing.quantity + quantity : quantity;
    if (target > nft.editionsAvailable) return 'unavailable';

    if (target <= 0) {
      cart.items = cart.items.filter((i) => i.nftId !== nftId);
    } else if (existing) {
      existing.quantity = target;
      existing.unitPrice = nft.price;
      existing.nft = this.snapshot(nft);
    } else {
      cart.items.push({ nftId, quantity: target, unitPrice: nft.price, nft: this.snapshot(nft) });
    }
    cart.version += 1;
    cart.updatedAt = nowIso(ts);
    this.persist();
    return cart;
  }

  removeCartItem(ownerKey: string, nftId: string, ts: number): Cart {
    const cart = this.getCart(ownerKey);
    cart.items = cart.items.filter((i) => i.nftId !== nftId);
    cart.version += 1;
    cart.updatedAt = nowIso(ts);
    this.persist();
    return cart;
  }

  clearPurchasedItems(userId: string, purchased: Array<{ nftId: string; quantity: number }>, ts: number): void {
    const cart = this.getCart(userId);
    for (const p of purchased) {
      const line = cart.items.find((i) => i.nftId === p.nftId);
      if (!line) continue;
      if (line.quantity <= p.quantity) {
        cart.items = cart.items.filter((i) => i.nftId !== p.nftId);
      } else {
        line.quantity -= p.quantity;
      }
    }
    cart.version += 1;
    cart.updatedAt = nowIso(ts);
    this.persist();
  }

  buildQuote(input: QuoteInput, ts: number): Quote {
    const lines = input.items.map((req) => {
      const nft = this.getNft(req.nftId)!;
      const lineTotal = mulEth(nft.price, req.quantity);
      const priceChanged = req.expectedUnitPrice !== undefined && cmpEth(req.expectedUnitPrice, nft.price) !== 0;
      const shortAvailability = req.quantity > nft.editionsAvailable;
      return {
        nftId: nft.id,
        name: nft.name,
        quantity: req.quantity,
        unitPrice: nft.price,
        lineTotal,
        availableEditions: nft.editionsAvailable,
        changed: priceChanged || shortAvailability,
      };
    });

    const subtotal = sumEth(lines.map((l) => l.lineTotal));
    const networkFee = NETWORK_FEE[input.chain];

    let discount = '0';
    let coupon: Quote['coupon'];
    if (input.couponCode) {
      const result = this.evaluateCoupon(input.couponCode, subtotal, ts);
      coupon = result.coupon;
      discount = result.discount;
    }

    const total = addEth(subEth(subtotal, discount), networkFee);

    // hash só do preço, pra reprice gerar um quoteId novo
    const quoteId = hashPayload({
      chain: input.chain,
      items: lines.map((l) => ({ nftId: l.nftId, quantity: l.quantity, unitPrice: l.unitPrice })),
      discount,
      networkFee,
      total,
    });

    return {
      quoteId,
      chain: input.chain,
      lines,
      subtotal,
      discount,
      networkFee,
      total,
      coupon,
      issuedAt: nowIso(ts),
      expiresAt: nowIso(ts + 2 * 60_000),
    };
  }

  private evaluateCoupon(code: string, subtotal: string, ts: number): { coupon: Quote['coupon']; discount: string } {
    const coupon = this.state.coupons.find((c) => c.code.toLowerCase() === code.toLowerCase());
    if (!coupon) {
      return { coupon: { code, valid: false, error: 'invalid' }, discount: '0' };
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= ts) {
      return { coupon: { code: coupon.code, valid: false, error: 'expired' }, discount: '0' };
    }
    if (coupon.minSubtotalEth && cmpEth(subtotal, coupon.minSubtotalEth) < 0) {
      return { coupon: { code: coupon.code, valid: false, error: 'min_not_met' }, discount: '0' };
    }
    const discountWei = (toWei(subtotal) * BigInt(coupon.percentOff)) / 100n;
    return {
      coupon: { code: coupon.code, valid: true, percentOff: coupon.percentOff },
      discount: fromWei(discountWei),
    };
  }

  getOrders(userId: string): Order[] {
    return this.state.orders[userId] ?? [];
  }

  getOrder(userId: string, orderId: string): Order | undefined {
    return this.getOrders(userId).find((o) => o.id === orderId);
  }

  findOrderByIdem(key: string): { order: Order; sameUser: (u: string) => boolean; payloadHash: string } | null {
    const ref = this.state.ordersByIdem[key];
    if (!ref) return null;
    const order = this.getOrder(ref.userId, ref.orderId);
    if (!order) return null;
    return { order, sameUser: (u) => u === ref.userId, payloadHash: ref.payloadHash };
  }

  createOrder(userId: string, idemKey: string, input: CreateOrderInput, ts: number): Order {
    const wallet = (this.state.wallets[userId] ?? []).find((w) => w.id === input.walletId);
    const quote = this.buildQuote({ chain: input.chain, items: input.items, couponCode: input.couponCode }, ts);

    const order: Order = {
      id: nextId('order'),
      status: 'pending',
      chain: input.chain,
      items: quote.lines.map((l) => {
        const nft = this.getNft(l.nftId)!;
        return {
          nftId: l.nftId,
          name: l.name,
          imageUrl: nft.imageUrl,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
        };
      }),
      subtotal: quote.subtotal,
      discount: quote.discount,
      networkFee: quote.networkFee,
      total: quote.total,
      couponCode: input.couponCode,
      walletAddress: wallet?.address ?? '0x0',
      collector: { name: input.collector.name, email: input.collector.email },
      createdAt: nowIso(ts),
      updatedAt: nowIso(ts),
      version: 1,
    };

    this.state.orders[userId] = [order, ...this.getOrders(userId)];
    this.state.ordersByIdem[idemKey] = { userId, orderId: order.id, payloadHash: hashPayload(input) };
    this.persist();
    return order;
  }

  settleOrder(userId: string, orderId: string, outcome: 'confirmed' | 'rejected', ts: number): Order | undefined {
    const order = this.getOrder(userId, orderId);
    if (!order || order.status !== 'pending') return order;
    order.status = outcome;
    order.version += 1;
    order.updatedAt = nowIso(ts);
    if (outcome === 'confirmed') {
      order.txHash = `0x${nextId('tx').replace(/[^a-f0-9]/gi, '').padEnd(40, '0').slice(0, 40)}`;
      for (const item of order.items) {
        const nft = this.getNft(item.nftId);
        if (nft) this.updateNft(nft.id, { editionsAvailable: Math.max(0, nft.editionsAvailable - item.quantity) });
      }
      this.clearPurchasedItems(userId, order.items.map((i) => ({ nftId: i.nftId, quantity: i.quantity })), ts);
    } else {
      order.rejectionReason = 'Pagamento recusado pela simulação da carteira.';
    }
    this.persist();
    this.emit('order.updated', { userId, order });
    return order;
  }

  getWallets(userId: string): Wallet[] {
    return this.state.wallets[userId] ?? [];
  }

  addWallet(userId: string, input: WalletInput): Wallet {
    const wallet: Wallet = { id: nextId('wallet'), ...input };
    const list = this.getWallets(userId);
    // só uma primary por vez
    if (input.kind === 'primary') list.forEach((w) => (w.kind = 'secondary'));
    list.push(wallet);
    this.state.wallets[userId] = list;
    this.persist();
    return wallet;
  }

  updateWallet(userId: string, walletId: string, input: Partial<WalletInput>): Wallet | undefined {
    const list = this.getWallets(userId);
    const wallet = list.find((w) => w.id === walletId);
    if (!wallet) return undefined;
    if (input.kind === 'primary') list.forEach((w) => (w.kind = 'secondary'));
    Object.assign(wallet, input);
    this.persist();
    return wallet;
  }
}

export const db = new MockDb();
