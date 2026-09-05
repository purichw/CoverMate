const { randomUUID } = require('node:crypto');

exports.fetchWithTimeout = (url, options = {}) => fetch(url, { ...options, signal: options.signal || AbortSignal.timeout(12000) });
exports.error = (status, code, message) => Object.assign(new Error(message), { status, code });
exports.json = (res, status, body) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.statusCode = status;
  res.end(JSON.stringify(body));
};
exports.readBody = async (req, maxBytes = 12000) => {
  const parse = text => {
    try { return JSON.parse(text); }
    catch { throw exports.error(400, 'invalid_json', 'Invalid JSON.'); }
  };
  if (Number(req.headers['content-length'] || 0) > maxBytes) throw exports.error(413, 'too_large', 'Request too large.');
  if (req.body !== undefined) {
    const text = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(text) > maxBytes) throw exports.error(413, 'too_large', 'Request too large.');
    return parse(text);
  }
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > maxBytes) throw exports.error(413, 'too_large', 'Request too large.');
    chunks.push(chunk);
  }
  return parse(Buffer.concat(chunks).toString('utf8'));
};
exports.reportFailure = (component, error, requestId = randomUUID()) => {
  // Never log request bodies, URLs, tokens, contact fields, or arbitrary messages.
  console.error(JSON.stringify({ component, requestId, status: Number(error.status || 500), code: /^[a-z0-9_-]{1,60}$/i.test(error.code || '') ? error.code : 'server_error' }));
  return requestId;
};
