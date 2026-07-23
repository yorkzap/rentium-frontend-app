import assert from 'node:assert/strict';
import test from 'node:test';

import worker from './vanity-subdomains.mjs';

function captureFetch() {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    calls.push(
      typeof input === 'string' || input instanceof URL
        ? String(input)
        : input.url
    );
    return new Response('proxied showcase', { status: 200 });
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

test('serves a vanity root from the canonical Vercel origin without redirecting', async () => {
  const capture = captureFetch();
  try {
    const response = await worker.fetch(
      new Request('https://raj.rentium.ca/?preview=1')
    );
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'proxied showcase');
    assert.deepEqual(capture.calls, [
      'https://www.rentium.ca/l/raj?preview=1',
    ]);
  } finally {
    capture.restore();
  }
});

test('does not intercept the tunneled API hostname', async () => {
  const capture = captureFetch();
  try {
    await worker.fetch(new Request('https://api.rentium.ca/health'));
    assert.deepEqual(capture.calls, ['https://api.rentium.ca/health']);
  } finally {
    capture.restore();
  }
});

test('repairs legacy app-subdomain document links without touching Vercel TLS', async () => {
  const response = await worker.fetch(
    new Request(
      'https://app.rentium.ca/business_document/67e33e96-9a79-4d7a-97b9-218e5145425c'
    )
  );
  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get('location'),
    'https://www.rentium.ca/dashboard/documents?document=67e33e96-9a79-4d7a-97b9-218e5145425c'
  );
});

test('uses temporary redirects for non-showcase navigation', async () => {
  const response = await worker.fetch(
    new Request('https://raj.rentium.ca/pricing')
  );
  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get('location'),
    'https://www.rentium.ca/pricing'
  );
});
