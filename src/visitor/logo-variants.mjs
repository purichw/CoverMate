// Delivery derivatives only. The CMS keeps the original, editable asset URL.
// A source hash guard disables stale derivatives after artwork is replaced.
const LOGO_VARIANTS = {
  '/assets/brand/covermate-advisory-logo-th.png': '12b85e3514bfa320',
  '/assets/brand/covermate-advisory-logo-en.png': 'bc279820a38a2d07'
};

// Match the largest initial use (the loading identity) so boot and header choose
// the same cached candidate. High-DPR/zoom browsers retain the 1200px original.
export const LOGO_RESPONSIVE_SIZES = '(max-height: 480px) 216px, (max-width: 361px) 200px, (max-width: 447px) 55.4vw, (max-width: 600px) 248px, 384px';

export function logoResponsiveSrcset(ref, versions = {}, origin = '') {
  if (typeof ref !== 'string' || !ref.trim() || !origin) return '';
  try {
    const url = new URL(ref, origin + '/');
    if (url.origin !== new URL(origin).origin || url.hash || [...url.searchParams.keys()].some(key => key !== 'cm_asset')) return '';
    const source = url.pathname, hash = LOGO_VARIANTS[source];
    if (!hash || versions[source] !== hash) return '';
    const variants = [480, 720].map(width => ({ path: source.replace('.png', '-' + width + '.webp'), width }));
    if (variants.some(item => !versions[item.path])) return '';
    return [...variants, { path: source, width: 1200 }].map(({ path, width }) => `${path}?cm_asset=${versions[path]} ${width}w`).join(', ');
  } catch { return ''; }
}
