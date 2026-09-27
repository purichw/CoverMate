import { onCLS, onINP, onLCP } from 'web-vitals';

if (!window.__covermateTelemetryInstalled) {
  window.__covermateTelemetryInstalled = true;
  let sent = 0;
  const kinds = new Set();
  const allowed = new Set(['runtime_error', 'unhandled_rejection', 'resource_error', 'content_timeout', 'content_error', 'lead_error', 'csp', 'LCP', 'INP', 'CLS']);
  const emit = (kind, value, details) => {
    const key = kind + JSON.stringify(details);
    if (location.hostname !== 'covermateinsurance.com' || !allowed.has(kind) || sent >= 12 || kinds.has(key)) return;
    kinds.add(key);
    sent += 1;
    const body = JSON.stringify({ kind, route: location.pathname, device: matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop', value, ...details });
    // A blocked beacon must not create another runtime error or interrupt the page.
    try { navigator.sendBeacon('/api/telemetry', new Blob([body], { type: 'application/json' })); } catch { /* Best effort only. */ }
  };
  onCLS(metric => emit('CLS', metric.value));
  onINP(metric => emit('INP', metric.value));
  onLCP(metric => emit('LCP', metric.value));
  addEventListener('error', async event => {
    if (!(event instanceof ErrorEvent)) return emit('resource_error');
    const boot = window.CoverMateBoot?.pending;
    let details;
    try { details = (await import('/assets/runtime-diagnostics.js')).runtimeDetails(event, boot); } catch { /* Basic count if diagnostics cannot load. */ }
    emit('runtime_error', undefined, details);
  }, true);
  addEventListener('unhandledrejection', () => emit('unhandled_rejection'));
  addEventListener('securitypolicyviolation', () => emit('csp'));
  addEventListener('covermate:diagnostic', event => emit(event.detail?.kind));
}
