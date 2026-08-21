const assert = require('node:assert/strict');
const test = require('node:test');
const {
  getHealthResponse,
  getKassalProductsResponse,
  getMenyCartResponse
} = require('../shared/handlers.cjs');
const { resolveItems } = require('../shared/meny.cjs');

test('health reports configured integrations', () => {
  const result = getHealthResponse({
    env: { KASSAL_API_KEY: 'key' },
    now: () => new Date('2026-08-21T12:00:00.000Z')
  });

  assert.deepEqual(result.body, {
    status: 'ok',
    kassal: true,
    time: '2026-08-21T12:00:00.000Z'
  });
});

test('Kassal proxy validates configuration and maps upstream products', async () => {
  const missing = await getKassalProductsResponse(
    { search: 'pølser' },
    { env: {}, fetchImpl: () => assert.fail('fetch must not run') }
  );
  assert.equal(missing.status, 503);

  let request;
  const success = await getKassalProductsResponse(
    { search: ' pølser ', size: '99' },
    {
      env: { KASSAL_API_KEY: 'secret-key' },
      fetchImpl: async (url, options) => {
        request = { url, options };
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              {
                id: 7,
                name: 'Grillpølser',
                brand: 'Test',
                store: { name: 'Butikk' },
                current_price: 42,
                current_unit_price: 70,
                weight_unit: 'kg'
              }
            ]
          })
        };
      }
    }
  );

  assert.equal(success.status, 200);
  assert.match(request.url, /search=p%C3%B8lser&size=20$/);
  assert.equal(request.options.headers.Authorization, 'Bearer secret-key');
  assert.equal(success.body.products[0].store, 'Butikk');
  assert.equal(success.headers['Cache-Control'], 'public, max-age=3600');
});

test('MENY handler sanitizes and caps request items', async () => {
  let received;
  const result = await getMenyCartResponse(
    {
      items: [
        { query: `  ${'x'.repeat(120)}  `, quantity: 99, name: ` ${'n'.repeat(90)} ` },
        { query: '   ', quantity: 1, name: 'ignored' }
      ]
    },
    {
      resolver: async (items, options) => {
        received = { items, options };
        return { cartItems: [], count: 1, matched: [], unmatched: [], partial: false };
      },
      timeoutMs: 1234
    }
  );

  assert.equal(result.status, 200);
  assert.equal(received.items.length, 1);
  assert.equal(received.items[0].query.length, 100);
  assert.equal(received.items[0].name.length, 80);
  assert.equal(received.items[0].quantity, 50);
  assert.equal(received.options.timeoutMs, 1234);
});

test('MENY handler reports a deadline before any match as 504', async () => {
  const result = await getMenyCartResponse(
    { items: [{ query: 'grillpølse', quantity: 1, name: 'Pølser' }] },
    {
      resolver: async () => {
        const error = new Error('deadline');
        error.code = 'NO_MATCHES';
        error.partial = true;
        error.unmatched = [{ name: 'Pølser', query: 'grillpølse' }];
        throw error;
      }
    }
  );

  assert.equal(result.status, 504);
  assert.equal(result.body.partial, true);
  assert.match(result.body.error, /tok for lang tid/);
});

test('MENY resolver stops within its global deadline', async () => {
  const fetchImpl = (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      const abort = () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      };
      if (signal.aborted) abort();
      else signal.addEventListener('abort', abort, { once: true });
    });

  const started = Date.now();
  await assert.rejects(
    resolveItems(
      [{ query: 'grillpølse', quantity: 1, name: 'Pølser' }],
      { timeoutMs: 25, fetchImpl, logger: { error() {} } }
    ),
    (error) => error.code === 'NO_MATCHES' && error.partial === true
  );
  assert.ok(Date.now() - started < 500);
});
