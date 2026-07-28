import assert from 'node:assert/strict';
import test from 'node:test';
import { clearRateLimitBuckets, createRateLimit } from '../server/middleware/rateLimit.js';

function responseRecorder() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('rate limiter allows requests through the configured maximum', () => {
  clearRateLimitBuckets();
  const middleware = createRateLimit({ windowMs: 60_000, max: 2 });
  const req = { ip: '127.0.0.1', method: 'POST', path: '/login' };
  let nextCalls = 0;

  middleware(req, responseRecorder(), () => { nextCalls += 1; });
  middleware(req, responseRecorder(), () => { nextCalls += 1; });

  assert.equal(nextCalls, 2);
});

test('rate limiter returns 429 and Retry-After after the maximum', () => {
  clearRateLimitBuckets();
  const middleware = createRateLimit({ windowMs: 60_000, max: 1 });
  const req = { ip: '127.0.0.1', method: 'POST', path: '/login' };
  const first = responseRecorder();
  const blocked = responseRecorder();

  middleware(req, first, () => {});
  middleware(req, blocked, () => assert.fail('blocked request called next'));

  assert.equal(blocked.statusCode, 429);
  assert.match(blocked.headers['Retry-After'], /^\d+$/);
  assert.deepEqual(blocked.body, { error: 'Too many requests. Try again later.' });
});

test('rate limits are isolated by route and client', () => {
  clearRateLimitBuckets();
  const middleware = createRateLimit({ windowMs: 60_000, max: 1 });
  let nextCalls = 0;

  middleware({ ip: 'a', method: 'POST', path: '/one' }, responseRecorder(), () => { nextCalls += 1; });
  middleware({ ip: 'a', method: 'POST', path: '/two' }, responseRecorder(), () => { nextCalls += 1; });
  middleware({ ip: 'b', method: 'POST', path: '/one' }, responseRecorder(), () => { nextCalls += 1; });

  assert.equal(nextCalls, 3);
});
