const diagnosticHeaders = ['retry-after', 'x-vercel-id', 'x-vercel-mitigated', 'server', 'content-type'];
const safeText = (value, limit) => String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);

export function uptimeResponseDiagnostics({ status, url, headers = {}, title = '' }) {
  const parsed = new URL(url);
  return {
    status,
    // Omit credentials, query strings and fragments from CI logs.
    url: safeText(`${parsed.origin}${parsed.pathname}`, 300),
    title: safeText(title, 120),
    headers: Object.fromEntries(diagnosticHeaders.filter(name => headers[name]).map(name => [name, safeText(headers[name], 160)]))
  };
}
