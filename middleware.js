import { rewrite } from '@vercel/functions';

// Static index.html otherwise wins over vercel.json's root rewrite.
// Match only Home; assets, APIs and Admin incur no middleware invocation.
export const config = { matcher: '/' };

export default function middleware(request) {
  const url = new URL(request.url);
  if (url.pathname !== '/') return;
  // A Home rewrite bypasses the host redirects in vercel.json. Redirect the
  // document first so its scripts and styles never cross origins under CSP.
  if (['covermate.vercel.app', 'www.covermateinsurance.com'].includes(url.hostname)) {
    url.protocol = 'https:';
    url.host = 'covermateinsurance.com';
    return Response.redirect(url, 308);
  }
  url.pathname = '/api/page';
  url.searchParams.set('route', '/');
  return rewrite(url);
}
