import { rewrite } from '@vercel/functions';

// Static index.html otherwise wins over vercel.json's root rewrite.
// Match only Home; assets, APIs and Admin incur no middleware invocation.
export const config = { matcher: '/' };

export default function middleware(request) {
  const url = new URL(request.url);
  if (url.pathname !== '/') return;
  url.pathname = '/api/page';
  url.searchParams.set('route', '/');
  return rewrite(url);
}
