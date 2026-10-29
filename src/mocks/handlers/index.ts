import { authHandlers } from './auth';
import { nftHandlers } from './nfts';
import { favoriteHandlers } from './favorites';
import { cartHandlers } from './cart';
import { quoteHandlers } from './quote';
import { orderHandlers } from './orders';
import { profileHandlers } from './profile';
import { walletHandlers } from './wallets';
import { artHandlers } from './art';
import { mockControlHandlers } from './mock-control';

export const restHandlers = [
  ...mockControlHandlers,
  ...authHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...quoteHandlers,
  ...orderHandlers,
  ...profileHandlers,
  ...walletHandlers,
  // nfts tem catch-all /nfts/:idOrSlug, deixa por ultimo
  ...nftHandlers,
  ...artHandlers,
];
