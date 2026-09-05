import { onCLS, onINP, onLCP } from 'web-vitals';

if (!window.__covermateTelemetryInstalled) {
  window.__covermateTelemetryInstalled = true;
  let sent = 0;
  const kinds = new Set();
  const allowed = new Set(['runtime_error', 'unhandled_rejection', 'resource_error', 'content_timeout', 'content_error', 'lead_error', 'csp', 'LCP', 'INP', 'CLS']);
  const emit = (kind, value) => {
    if (location.hostname !== 'covermate.vercel.app' || !allowed.has(kind) || sent >= 12 || kinds.has(kind)) return;
    kinds.add(kind);
    sent += 1;
    const body = JSON.stringify({ kind, route: location.pathname, device: matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop', value });
    navigator.sendBeacon('/api/telemetry', new Blob([body], { type: 'application/json' }));
  };
  onCLS(metric => emit('CLS', metric.value));
  onINP(metric => emit('INP', metric.value));
  onLCP(metric => emit('LCP', metric.value));
  addEventListener('error', event => emit(event instanceof ErrorEvent ? 'runtime_error' : 'resource_error'), true);
  addEventListener('unhandledrejection', () => emit('unhandled_rejection'));
  addEventListener('securitypolicyviolation', () => emit('csp'));
  addEventListener('covermate:diagnostic', event => emit(event.detail?.kind));
}
