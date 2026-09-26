const errorNames = new Set(['Error', 'TypeError', 'ReferenceError', 'SyntaxError', 'RangeError', 'SecurityError', 'AbortError']);

// Loaded only after a runtime error; never serialize messages, stacks or URLs.
export function runtimeDetails(event, boot) {
  const opaque = event.message === 'Script error.' && !event.error && !event.filename;
  let source = 'unknown';
  try {
    if (event.filename) {
      const url = new URL(event.filename, location.href);
      source = url.protocol === 'blob:' ? 'embedded' : url.origin === location.origin ? 'same_origin' : 'cross_origin';
    }
  } catch { /* Keep malformed or unavailable sources anonymous. */ }
  const ua = navigator.userAgent;
  return {
    errorClass: opaque ? 'opaque' : errorNames.has(event.error?.name) ? event.error.name : 'other',
    source,
    phase: boot ? 'boot' : 'ready',
    engine: /Firefox\//.test(ua) ? 'firefox' : /Chrome\/|Chromium\//.test(ua) ? 'chromium' : /AppleWebKit\//.test(ua) ? 'webkit' : 'other',
    line: event.lineno,
    column: event.colno
  };
}
