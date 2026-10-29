import type {
  ChainId,
  Creator,
  Nft,
  NftCategory,
  User,
  Wallet,
} from '@/types';

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATEGORIES: NftCategory[] = [
  'art',
  'photography',
  'music',
  '3d',
  'collectible',
  'generative',
  'gaming',
  'subscription',
  'utility',
];
const CHAINS: ChainId[] = ['ethereum', 'polygon', 'solana'];

const COLLECTIONS = [
  'Neon Genesis',
  'Chromatic Dreams',
  'Pixel Pantheon',
  'Astral Bloom',
  'Void Walkers',
  'Golden Era',
  'Cyber Fauna',
  'Liquid Light',
];

const CREATOR_NAMES = [
  'Luna Vega',
  'Kai Nakamura',
  'Aria Volkov',
  'Dex Mercer',
  'Nova Reyes',
  'Orion Blake',
  'Sage Winter',
  'Zephyr Cole',
];

const ADJECTIVES = ['Emerald', 'Sage', 'Neon', 'Cosmic', 'Violet', 'Ivory', 'Golden', 'Crimson', 'Azure', 'Obsidian'];
const NOUNS = ['Ape', 'Nomad', 'Vessel', 'Bloom', 'Baron', 'Beat', 'Signal', 'Frequency', 'Primate', 'Specter'];

const IMG = {
  emerald: '/images/ape-emerald.png',
  baron: '/images/ape-baron.png',
  beat: '/images/ape-beat.png',
  nomad: '/images/ape-nomad.png',
} as const;
const APE_IMAGES = Object.values(IMG);

// Primeiros cards batem exatamente com o Figma (nome, nº e preço).
const CURATED: Array<{ name: string; num: string; price: string; img: keyof typeof IMG }> = [
  { name: 'Emerald Ape', num: '042', price: '1.19', img: 'emerald' },
  { name: 'Sage Nomad', num: '009', price: '1.69', img: 'nomad' },
  { name: 'Neon Vessel', num: '552', price: '1.99', img: 'baron' },
  { name: 'Cosmic Bloom', num: '118', price: '1.29', img: 'nomad' },
  { name: 'Violet Nomad', num: '314', price: '1.39', img: 'beat' },
  { name: 'Ivory Baron', num: '088', price: '1.79', img: 'baron' },
  { name: 'Golden Beat', num: '207', price: '0.99', img: 'beat' },
  { name: 'Golden Frequency', num: '071', price: '0.59', img: 'beat' },
  { name: 'Golden Signal', num: '160', price: '0.39', img: 'emerald' },
];

function makeCreators(): Creator[] {
  return CREATOR_NAMES.map((name, i) => ({
    id: `creator-${i + 1}`,
    name,
    avatarUrl: `/art/creator-${i + 1}.svg`,
    verified: i % 3 !== 0,
  }));
}

export function buildNfts(): Nft[] {
  const rnd = mulberry32(0xc0ffee);
  const creators = makeCreators();
  const count = 48;

  const specs = Array.from({ length: count }, (_, i) => {
    if (i < CURATED.length) {
      const c = CURATED[i];
      return { name: `${c.name} #${c.num}`, price: c.price, image: IMG[c.img] };
    }
    const adj = ADJECTIVES[Math.floor(rnd() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(rnd() * NOUNS.length)];
    const num = String(100 + Math.floor(rnd() * 899)).padStart(3, '0');
    return {
      name: `${adj} ${noun} #${num}`,
      price: (0.2 + rnd() * 4.6).toFixed(2),
      image: APE_IMAGES[i % APE_IMAGES.length],
    };
  });

  return specs.map((spec, i) => {
    const id = `nft-${String(i + 1).padStart(3, '0')}`;
    const category = CATEGORIES[i % CATEGORIES.length];
    const chain = CHAINS[Math.floor(rnd() * CHAINS.length)];
    const creator = creators[Math.floor(rnd() * creators.length)];
    const collection = COLLECTIONS[Math.floor(rnd() * COLLECTIONS.length)];
    const editionsTotal = 1 + Math.floor(rnd() * 25);
    const editionsAvailable = rnd() < 0.1 ? 0 : Math.max(1, Math.floor(rnd() * editionsTotal));
    const slug = `${spec.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    const gIdx = APE_IMAGES.indexOf(spec.image);

    return {
      id,
      slug,
      name: spec.name,
      description: `${spec.name} é uma peça da coleção ${collection}, cunhada por ${creator.name}. Uma obra explorando luz, forma e movimento no universo cripto.`,
      imageUrl: spec.image,
      gallery: [spec.image, APE_IMAGES[(gIdx + 1) % APE_IMAGES.length], APE_IMAGES[(gIdx + 2) % APE_IMAGES.length]],
      collection,
      category,
      chain,
      creator,
      price: spec.price,
      editionsTotal,
      editionsAvailable,
      likes: Math.floor(rnd() * 2000),
      featured: i < 6,
      attributes: [
        { trait: 'Coleção', value: collection },
        { trait: 'Raridade', value: ['Comum', 'Raro', 'Épico', 'Lendário'][Math.floor(rnd() * 4)] },
        { trait: 'Categoria', value: category },
      ],
      // índice 0 = mais recente (aparece primeiro na ordenação padrão)
      createdAt: new Date(Date.UTC(2025, 0, 1) + (count - i) * 86_400_000).toISOString(),
      version: 1,
    };
  });
}

export interface SeedUser extends User {
  password: string;
}

export function buildUsers(): SeedUser[] {
  return [
    {
      id: 'user-collector',
      email: 'collector@nftm.dev',
      password: 'Password123!',
      name: 'Camila Collector',
      avatarUrl: '/art/user-collector.svg',
      createdAt: new Date(Date.UTC(2025, 2, 10)).toISOString(),
    },
    {
      id: 'user-trader',
      email: 'trader@nftm.dev',
      password: 'Password123!',
      name: 'Téo Trader',
      avatarUrl: '/art/user-trader.svg',
      createdAt: new Date(Date.UTC(2025, 4, 22)).toISOString(),
    },
  ];
}

export function buildWallets(): Record<string, Wallet[]> {
  return {
    'user-collector': [
      { id: 'wallet-c2', label: 'Reserva', address: '0x1234aBCd5678eF901234aBCd5678eF901234aBCd', chain: 'polygon', kind: 'secondary' },
      { id: 'wallet-c1', label: 'Principal', address: '0x8a3D1f2b4C5e6F7a8B9c0D1e2F3a4B5c6D7e8F90', chain: 'ethereum', kind: 'primary' },
    ],
    'user-trader': [
      { id: 'wallet-t1', label: 'Cold wallet', address: '0xAbCd00112233445566778899aAbBcCdDeEfF0011', chain: 'solana', kind: 'primary' },
    ],
  };
}

export interface Coupon {
  code: string;
  percentOff: number;
  expiresAt: string | null;
  minSubtotalEth?: string;
}

export function buildCoupons(): Coupon[] {
  return [
    { code: 'WELCOME10', percentOff: 10, expiresAt: null },
    { code: 'ETH20', percentOff: 20, expiresAt: null, minSubtotalEth: '2' },
    { code: 'EXPIRED5', percentOff: 5, expiresAt: new Date(Date.UTC(2024, 0, 1)).toISOString() },
  ];
}
