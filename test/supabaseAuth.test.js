import assert from 'node:assert/strict';
import test from 'node:test';
import { requireSupabaseUser } from '../server/middleware/supabaseAuth.js';

function responseRecorder() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('protected Express routes reject requests without a Supabase bearer token', async () => {
  const req = { get: () => '' };
  const res = responseRecorder();
  let nextCalled = false;

  await requireSupabaseUser(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: 'Missing bearer token.' });
  assert.equal(nextCalled, false);
});
