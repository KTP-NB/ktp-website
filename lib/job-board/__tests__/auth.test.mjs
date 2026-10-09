import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractAccessToken } from '../supabaseServer.js';
import { isAuthServiceUnavailable } from '../authErrors.js';

function requestWithAuthorization(value) {
  return {
    headers: new Headers(value ? { authorization: value } : {}),
  };
}

test('extracts bearer tokens from API requests', () => {
  const request = requestWithAuthorization('Bearer test-token');
  assert.equal(extractAccessToken(request), 'test-token');
});

test('returns null when bearer token is missing', () => {
  assert.equal(extractAccessToken(requestWithAuthorization(null)), null);
  assert.equal(extractAccessToken(requestWithAuthorization('Basic abc123')), null);
});

test('identifies auth service connectivity failures', () => {
  assert.equal(
    isAuthServiceUnavailable({
      name: 'AuthRetryableFetchError',
      message: 'fetch failed',
    }),
    true,
  );

  assert.equal(
    isAuthServiceUnavailable({
      message: 'request failed',
      cause: { message: 'Connect Timeout Error' },
    }),
    true,
  );
});

test('does not treat invalid credentials as service outages', () => {
  assert.equal(isAuthServiceUnavailable({ message: 'Invalid JWT' }), false);
});
