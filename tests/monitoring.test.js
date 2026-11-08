import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import cache, { closeRedis } from '../src/utils/cache.js';
import { prisma } from '../src/db.js';

// Закриваємо з'єднання, щоб процес тестів завершився
after(async () => {
  await closeRedis();
  await prisma.$disconnect();
});

// --- Кеш (використовується для часто читаємих списків) ---

describe('Кеш', () => {
  test('wrap повертає значення за промахом і з кешу', async () => {
    let calls = 0;
    const fetchFn = async () => {
      calls += 1;
      return { value: 42 };
    };

    const first = await cache.wrap('test:key', 10, fetchFn);
    const second = await cache.wrap('test:key', 10, fetchFn);

    assert.deepEqual(first, { value: 42 });
    assert.deepEqual(second, { value: 42 });
    assert.equal(calls, 1, 'fetchFn має викликатися лише один раз (другий - з кешу)');
  });

  test('delPrefix інвалідовує кешовані значення', async () => {
    await cache.set('product:list:a', { page: 1 }, 60);
    await cache.set('product:list:b', { page: 2 }, 60);
    await cache.set('category:list:a', { page: 1 }, 60);

    await cache.delPrefix('product:list');

    assert.equal(await cache.get('product:list:a'), undefined);
    assert.equal(await cache.get('product:list:b'), undefined);
    assert.deepEqual(await cache.get('category:list:a'), { page: 1 }, 'інші префікси не чіпаються');
  });

  test('інвалідація при зміні даних: список перечитується після мутації', async () => {
    let dataVersion = 1;
    const readList = () => cache.wrap('category:list', 60, async () => ({ version: dataVersion }));

    assert.deepEqual(await readList(), { version: 1 });

    // "Зміна даних" - контролер інвалідує префікс і наступне читання свіже
    dataVersion = 2;
    await cache.delPrefix('category:list');
    assert.deepEqual(await readList(), { version: 2 });
  });
});

// --- Моніторинг ---

describe('Моніторинг', () => {
  test('GET /health віддає статус без звернення до БД', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok(res.body.uptime > 0);
  });

  test('GET /metrics повертає метрики Prometheus', async () => {
    // Генеруємо HTTP-запит, щоб лічильники були ненульовими
    await request(app).get('/health');

    const res = await request(app).get('/metrics');
    assert.equal(res.status, 200);
    assert.match(res.text, /http_requests_total/);
    assert.match(res.text, /http_request_duration_seconds/);
    assert.match(res.text, /ws_connections_active/);
    assert.match(res.text, /cache_hits_total/);
  });
});
