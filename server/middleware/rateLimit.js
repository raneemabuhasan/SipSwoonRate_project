const buckets = new Map();

function getClientKey(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function createRateLimit({ windowMs, max, message = 'Too many requests. Try again later.' }) {
  return function rateLimit(req, res, next) {
    const now = Date.now();
    const key = `${req.method}:${req.path}:${getClientKey(req)}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    current.count += 1;
    if (current.count <= max) {
      next();
      return;
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({ error: message });
  };
}

export function clearRateLimitBuckets() {
  buckets.clear();
}
