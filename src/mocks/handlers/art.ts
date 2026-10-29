import { http, HttpResponse } from 'msw';
import { artSvg, avatarSvg } from '../data/art';

export const artHandlers = [
  http.get('/art/:seed', ({ params }) => {
    const seed = String(params.seed).replace(/\.svg$/, '');
    const svg = seed.includes('avatar') || seed.includes('creator') || seed.includes('user')
      ? avatarSvg(seed)
      : artSvg(seed);
    return new HttpResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }),
];
