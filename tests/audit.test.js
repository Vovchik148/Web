// Тести п. 4 (журнал аудиту) та п. 6 (детальні дозволи)
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { prisma } from '../src/db.js';

// userId з payload токена (без перевірки підпису)
const a_id = (token) => jwt.decode(token).userId;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const password = 'TestPassword123';
const worker = { email: 'audit-worker@example.com', password, firstName: 'Audit', lastName: 'Worker' };
const admin = { email: 'audit-admin@example.com', password, firstName: 'Audit', lastName: 'Admin' };

describe('Audit log + permissions (пп. 4, 6)', () => {
  let workerToken;
  let adminToken;
  let workerId;
  let categoryId;
  let productId;

  before(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [worker.email, admin.email] } } });

    const w = await request(app).post('/api/auth/register').send(worker);
    workerToken = w.body.tokens.accessToken;
    workerId = w.body.user.id;

    const a = await request(app).post('/api/auth/register').send(admin);
    adminToken = a.body.tokens.accessToken;
    // Підвищуємо до ADMIN напряму в БД (публічна реєстрація завжди створює WORKER)
    await prisma.user.update({ where: { id: a.body.user.id }, data: { role: 'ADMIN' } });

    const category = await prisma.category.create({ data: { name: `AuditCat-${Date.now()}` } });
    categoryId = category.id;
  });

  after(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [worker.email, admin.email] } } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  // --- Дозволи (п. 6) ---

  test('WORKER не може створювати товари (products:write) - 403', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ sku: `PW-${Date.now()}`, name: 'Тест', price: 10, categoryId });
    assert.equal(res.status, 403);
    assert.match(res.body.message, /products:write/);
  });

  test('WORKER може читати товари (products:read)', async () => {
    const res = await request(app).get('/api/products').set('Authorization', `Bearer ${workerToken}`);
    assert.equal(res.status, 200);
  });

  test('WORKER не бачить журнал аудиту (audit:read) - 403', async () => {
    const res = await request(app).get('/api/audit-logs').set('Authorization', `Bearer ${workerToken}`);
    assert.equal(res.status, 403);
  });

  // --- Аудит (п. 4) ---

  test('без токена журнал аудиту 401', async () => {
    assert.equal((await request(app).get('/api/audit-logs')).status, 401);
  });

  // Дія в журнал пишеться неблокуюче (logAction - fire-and-forget), тому після
  // запиту запис може ще не бути закомічений. Поллінг: чекаємо, поки всі очікувані
  // дії з'являться у журналі, максимум timeoutMs.
  const waitForActions = async (query, expected, timeoutMs = 3000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ ...query, limit: 50 });
      const actions = res.body.data.map((l) => l.action);
      if (expected.every((a) => actions.includes(a))) return true;
      await sleep(100);
    }
    return false;
  };

  test('дії з товарами потрапляють у журнал', async () => {
    const create = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: `AUD-${Date.now()}`, name: 'Аудит-товар', price: 99, categoryId });
    assert.equal(create.status, 201);
    productId = create.body.id;

    await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Аудит-товар (оновлений)' });

    await request(app).delete(`/api/products/${productId}`).set('Authorization', `Bearer ${adminToken}`);

    const found = await waitForActions(
      { userId: a_id(adminToken), entity: 'product' },
      ['product.create', 'product.update', 'product.delete'],
    );
    assert.ok(found, 'у журналі є product.create, product.update та product.delete');
  });

  test('невдалий вхід логується з userId = null', async () => {
    await request(app).post('/api/auth/login').send({ email: 'no-such-user@example.com', password: 'WrongPass123' });

    const deadline = Date.now() + 3000;
    let record = null;
    while (Date.now() < deadline && !record) {
      const logs = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ action: 'auth.login_failed', limit: 50 });
      record = logs.body.data.find((l) => l.userId === null) || null;
      if (!record) await sleep(100);
    }
    assert.ok(record, 'запис із null userId існує');
  });

  test('фільтри та пагінація працюють', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ action: 'auth', page: 1, limit: 2 });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length <= 2);
    assert.ok(res.body.data.every((l) => l.action.startsWith('auth.')));

    const byUser = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ userId: workerId });
    assert.equal(byUser.status, 200);
    assert.ok(byUser.body.data.every((l) => l.userId === workerId));
  });

  test('невалідні фільтри - 400', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ from: 'не-дата' });
    assert.equal(res.status, 400);
  });
});
