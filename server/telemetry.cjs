const KINDS = new Set(['runtime_error', 'unhandled_rejection', 'resource_error', 'content_timeout', 'content_error', 'lead_error', 'csp', 'LCP', 'INP', 'CLS']);
/** @param {{kind?: unknown, route?: unknown, device?: unknown, value?: unknown} | null | undefined} input */
exports.sanitizeEvent = function sanitizeEvent(input) {
  if (!input || typeof input.kind !== 'string' || !KINDS.has(input.kind)) return null;
  return {
    kind: input.kind,
    route: typeof input.route === 'string' && ['/', '/motor', '/admin', '/admin/edit', '/admin/content', '/admin/preview', '/admin/login'].includes(input.route) ? input.route : 'other',
    device: input.device === 'mobile' ? 'mobile' : 'desktop',
    value: typeof input.value === 'number' && Number.isFinite(input.value) ? Math.max(0, Math.min(input.value, 120000)) : undefined
  };
};
