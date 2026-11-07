// Тест п. 1 (rate limiting): суворий ліміт для /api/auth.
// ВАЖЛИВО: ліміт читається з env при імпорті app.js (у config.js), а в ESM
// статичні імпорти виконуються ДО коду модуля. Тому app імпортуємо динамічно
// лише ПІСЛЯ того, як задали змінні середовища.
process.env.AUTH_RATE_LIMIT_MAX = '5';
process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES = '15';

const { default: app } = await import('../src/app.js');

import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { prisma } from '../src/db.js';

describe('Rate limiting /api/auth (п. 5)', () => {
  after(async () => {
    await prisma.$disconnect();
  });

  test('відповідає заголовками RateLimit-*', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });
    assert.equal(res.status, 200);
    assert.equal(res.headers['ratelimit-limit'], '5', 'ліміт взято з AUTH_RATE_LIMIT_MAX');
    assert.ok(res.headers['ratelimit-remaining'], 'є заголовок RateLimit-Remaining');
  });

  test('після перевищення ліміту повертає 429', async () => {
    // Ліміт 5: перший запит був у попередньому тесті, тут ще 4 - і 6-й упирається в ліміт
    for (let i = 0; i < 4; i++) {
      const res = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });
      assert.equal(res.status, 200);
    }

    const blocked = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });
    assert.equal(blocked.status, 429);
    assert.match(blocked.body.message, /Забагато/);
  });

  test('ліміт не блокує ендпоінти поза /api/auth', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
  });
});
