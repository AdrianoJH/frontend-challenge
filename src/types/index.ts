import type { Eth } from '@/lib/money';

export type ChainId = 'ethereum' | 'polygon' | 'solana';

export type NftCategory =
  | 'art'
  | 'photography'
  | 'music'
  | '3d'
  | 'collectible'
  | 'generative'
  | 'gaming'
  | 'subscription'
  | 'utility';

export type NftSort = 'recent' | 'price_asc' | 'price_desc' | 'popular';

export interface Creator {
  id: string;
  name: string;
  avatarUrl: string;
  verified: boolean;
}

export interface NftAttribute {
  trait: string;
  value: string;
  rarity?: number;
}

export interface Nft {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  gallery: string[];
  collection: string;
  category: NftCategory;
  chain: ChainId;
  creator: Creator;
  price: Eth;
  editionsTotal: number;
  editionsAvailable: number;
  likes: number;
  featured: boolean;
  attributes: NftAttribute[];
  createdAt: string;
  version: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface NftListParams {
  q?: string;
  categories?: NftCategory[];
  chains?: ChainId[];
  minPrice?: string;
  maxPrice?: string;
  sort?: NftSort;
  page?: number;
  pageSize?: number;
  availableOnly?: boolean;
}

/* --------------------------- Account & session --------------------------- */

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  createdAt: string;
}

export interface Session {
  token: string;
  user: User;
  expiresAt: string;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface RegisterInput extends Credentials {
  name: string;
}

/* ------------------------------- Favorites ------------------------------- */

export interface FavoritesResponse {
  nftIds: string[];
}

/* --------------------------------- Cart ---------------------------------- */

export interface CartItem {
  nftId: string;
  quantity: number;
  unitPrice: Eth;
  nft: Pick<
    Nft,
    'id' | 'slug' | 'name' | 'imageUrl' | 'chain' | 'price' | 'editionsAvailable' | 'version'
  >;
}

export interface Cart {
  id: string;
  items: CartItem[];
  version: number;
  updatedAt: string;
}

/* -------------------------------- Quote ---------------------------------- */

export interface QuoteInput {
  chain: ChainId;
  items: Array<{
    nftId: string;
    quantity: number;
    expectedUnitPrice?: Eth;
  }>;
  couponCode?: string;
}

export type CouponError = 'invalid' | 'expired' | 'min_not_met';

export interface QuoteLine {
  nftId: string;
  name: string;
  quantity: number;
  unitPrice: Eth;
  lineTotal: Eth;
  changed?: boolean;
  availableEditions: number;
}

export interface Quote {
  quoteId: string;
  chain: ChainId;
  lines: QuoteLine[];
  subtotal: Eth;
  discount: Eth;
  networkFee: Eth;
  total: Eth;
  coupon?: {
    code: string;
    valid: boolean;
    error?: CouponError;
    percentOff?: number;
  };
  issuedAt: string;
  expiresAt: string;
}

/* -------------------------------- Orders --------------------------------- */

export type OrderStatus = 'pending' | 'confirmed' | 'rejected';

export interface OrderItem {
  nftId: string;
  name: string;
  imageUrl: string;
  quantity: number;
  unitPrice: Eth;
  lineTotal: Eth;
}

export interface Order {
  id: string;
  status: OrderStatus;
  chain: ChainId;
  items: OrderItem[];
  subtotal: Eth;
  discount: Eth;
  networkFee: Eth;
  total: Eth;
  couponCode?: string;
  walletAddress: string;
  collector: { name: string; email: string };
  txHash?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CreateOrderInput {
  quoteId: string;
  chain: ChainId;
  walletId: string;
  collector: { name: string; email: string };
  couponCode?: string;
  items: Array<{ nftId: string; quantity: number }>;
}

/* -------------------------------- Wallets -------------------------------- */

export type WalletKind = 'primary' | 'secondary';

export interface Wallet {
  id: string;
  label: string;
  address: string;
  chain: ChainId;
  kind: WalletKind;
}

export interface WalletInput {
  label: string;
  address: string;
  chain: ChainId;
  kind: WalletKind;
}

/* -------------------------------- Profile -------------------------------- */

export interface ProfileInput {
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
}

/* ------------------------------- API errors ------------------------------ */

export type ApiErrorCode =
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'availability'
  | 'coupon'
  | 'rate_limited'
  | 'transient'
  | 'timeout';

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  fields?: Record<string, string>;
}

/* ----------------------------- Realtime events --------------------------- */

export interface RealtimeEnvelope<T> {
  eventId: string;
  resource: { type: 'nft' | 'order'; id: string };
  version: number;
  emittedAt: string;
  userId?: string;
  data: T;
}

export type NftUpdatedEvent = RealtimeEnvelope<{
  id: string;
  price: Eth;
  editionsAvailable: number;
  version: number;
}>;

export type OrderUpdatedEvent = RealtimeEnvelope<{
  id: string;
  status: OrderStatus;
  txHash?: string;
  rejectionReason?: string;
  version: number;
}>;
