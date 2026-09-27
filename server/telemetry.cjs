const KINDS = new Set(['runtime_error', 'unhandled_rejection', 'resource_error', 'content_timeout', 'content_error', 'lead_error', 'csp', 'LCP', 'INP', 'CLS']);
const RUNTIME_FIELDS = {
  errorClass: new Set(['Error', 'TypeError', 'ReferenceError', 'SyntaxError', 'RangeError', 'SecurityError', 'AbortError', 'opaque', 'other']),
  source: new Set(['same_origin', 'cross_origin', 'embedded', 'unknown']),
  phase: new Set(['boot', 'ready']),
  engine: new Set(['chromium', 'webkit', 'firefox', 'other'])
};
/** @param {Record<string, unknown> | null | undefined} input */
exports.sanitizeEvent = function sanitizeEvent(input) {
  if (!input || typeof input.kind !== 'string' || !KINDS.has(input.kind)) return null;
  /** @type {Record<string, string | number | undefined>} */
  const event = {
    kind: input.kind,
    route: typeof input.route === 'string' && ['/', '/motor', '/admin', '/admin/edit', '/admin/content', '/admin/preview', '/admin/login'].includes(input.route) ? input.route : 'other',
    device: input.device === 'mobile' ? 'mobile' : 'desktop',
    value: typeof input.value === 'number' && Number.isFinite(input.value) ? Math.max(0, Math.min(input.value, 120000)) : undefined
  };
  if (input.kind === 'runtime_error') {
    for (const [key, values] of Object.entries(RUNTIME_FIELDS)) {
      const value = input[key];
      if (typeof value === 'string' && values.has(value)) event[key] = value;
    }
    for (const key of ['line', 'column']) {
      const value = input[key];
      if (typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 10000000) event[key] = value;
    }
  }
  return event;
};
