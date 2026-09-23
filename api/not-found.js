// Non-page fallback only. Keep missing APIs/assets/private paths out of the
// public HTML recovery page; the status is fixed and never read from a query.
module.exports = function notFound(req, res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(req.method === 'HEAD' ? '' : JSON.stringify({ error: 'NOT_FOUND' }));
};
