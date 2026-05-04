const CACHE_RULES = [
  { test: (m, path) => m === 'GET' && path === '/api/trains/stats',
    header: 'public, max-age=15, stale-while-revalidate=30' },
  { test: (m, path) => m === 'GET' && path === '/api/analytics/overview',
    header: 'public, max-age=30, stale-while-revalidate=60' },
  { test: (m, path) => m === 'GET' && path.startsWith('/api/trains'),
    header: 'private, max-age=10' },
  { test: (m) => ['POST', 'PUT', 'DELETE'].includes(m),
    header: 'no-store' },
];

module.exports = function cacheMiddleware(req, res, next) {
  const rule = CACHE_RULES.find(r => r.test(req.method, req.path));
  if (rule) res.set('Cache-Control', rule.header);
  next();
};
