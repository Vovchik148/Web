import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/db.js';
import { createNotification, createBatchNotification } from '../src/services/notificationService.js';
import { closeQueue } from '../src/services/queue.js';
import { closeRedis } from '../src/utils/cache.js';

// Закриваємо фонові з'єднання, щоб процес тестів завершився
after(async () => {
  await closeQueue();
  await closeRedis();
  await prisma.$disconnect();
});

// Користувач для API-тестів (реєструємо через REST, як в інших тестах)
const user = { email: 'notify-test@example.com', password: 'TestPassword123', firstName: 'Notify', lastName: 'Test' };
let token;
let userId;

const waitForNotification = async (matchFn, timeoutMs = 5000, authToken = token) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${authToken}`);
    const found = res.body.data?.find(matchFn);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return null;
};

describe('Notifications API', () => {
  before(async () => {
    await prisma.user.deleteMany({ where: { email: user.email } });
    const reg = await request(app).post('/api/auth/register').send(user);
    token = reg.body.tokens.accessToken;
    userId = reg.body.user.id;
  });

  after(async () => {
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email: user.email } });
  });

  test('без токена 401', async () => {
    assert.equal((await request(app).get('/api/notifications')).status, 401);
  });

  test('створене сповіщення з\'являється у списку та в лічильнику unread', async () => {
    await createNotification({
      userId,
      type: 'SYSTEM',
      title: 'Вітаємо',
      message: 'Тестове системне сповіщення',
      data: { foo: 'bar' },
    });

    const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    const found = res.body.data.find((n) => n.title === 'Вітаємо');
    assert.ok(found);
    assert.equal(found.type, 'SYSTEM');
    assert.equal(found.priority, 'NORMAL');
    assert.equal(found.read, false);
    assert.deepEqual(found.data, { foo: 'bar' });
    assert.ok(res.body.unreadCount >= 1);
  });

  test('batch-розсилка створює сповіщення кільком користувачам', async () => {
    await createBatchNotification([userId], {
      type: 'PRODUCT',
      priority: 'HIGH',
      title: 'Масове сповіщення',
      message: 'Створено одне сповіщення через чергу',
    });

    const found = await waitForNotification((n) => n.title === 'Масове сповіщення');
    assert.ok(found, 'batch-сповіщення не з\'явилося у списку за 5 секунд');
    assert.equal(found.priority, 'HIGH');
    assert.equal(found.type, 'PRODUCT');
  });

  test('маркування прочитаним: одне, потім усі', async () => {
    const created = await createNotification({ userId, type: 'MOVEMENT', title: 'Рух товару', message: 'Перевірка read' });

    const mark = await request(app)
      .patch(`/api/notifications/${created.id}/read`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(mark.status, 200);
    assert.equal(mark.body.read, true);
    assert.ok(mark.body.readAt);

    await createNotification({ userId, type: 'MOVEMENT', title: 'Рух товару 2', message: 'Ще одне' });
    const readAll = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(readAll.status, 200);
    assert.ok(readAll.body.updated >= 2);

    const count = await request(app).get('/api/notifications/unread-count').set('Authorization', `Bearer ${token}`);
    assert.equal(count.body.unreadCount, 0);
  });

  test('фільтр unread повертає лише непрочитані', async () => {
    await createNotification({ userId, type: 'SYSTEM', title: 'Непрочитане', message: 'Фільтр' });
    const res = await request(app)
      .get('/api/notifications?unread=true')
      .set('Authorization', `Bearer ${token}`);
    res.body.data.forEach((n) => assert.equal(n.read, false));
  });

  test('чуже сповіщення не читається і не видаляється (404)', async () => {
    // Окремий користувач-власник "чужого" сповіщення
    const otherUser = await prisma.user.create({
      data: {
        email: 'notify-other@example.com',
        password: 'unused-hash',
        firstName: 'Other',
        lastName: 'User',
      },
    });
    const other = await createNotification({ userId: otherUser.id, type: 'SYSTEM', title: 'Чуже', message: 'Не ваше' });

    const read = await request(app).patch(`/api/notifications/${other.id}/read`).set('Authorization', `Bearer ${token}`);
    assert.equal(read.status, 404);

    const del = await request(app).delete(`/api/notifications/${other.id}`).set('Authorization', `Bearer ${token}`);
    assert.equal(del.status, 404);

    await prisma.notification.deleteMany({ where: { userId: otherUser.id } });
    await prisma.user.delete({ where: { id: otherUser.id } });
  });

  test('видалення власного сповіщення', async () => {
    const created = await createNotification({ userId, type: 'SYSTEM', title: 'На видалення', message: 'Пока' });
    const res = await request(app).delete(`/api/notifications/${created.id}`).set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 204);
    assert.equal(await prisma.notification.findUnique({ where: { id: created.id } }), null);
  });
});

describe('Низький залишок → сповіщення (end-to-end)', () => {
  const admin = { email: 'lowstock-admin@example.com', password: 'TestPassword123', firstName: 'Low', lastName: 'Stock' };
  let adminToken;
  let adminId;
  let productId;
  let warehouseId;
  let categoryId;

  // Стійке прибирання після попередніх (можливо перерваних) прогонів:
  // рухи товарів посилаються на користувача без onDelete: Cascade, тому їх
  // видаляємо окремо перед видаленням користувача
  const cleanupLeftovers = async () => {
    const leftover = await prisma.user.findUnique({ where: { email: admin.email } });
    if (!leftover) return;
    await prisma.stockMovement.deleteMany({ where: { userId: leftover.id } });
    await prisma.notification.deleteMany({ where: { userId: leftover.id } });
    await prisma.user.delete({ where: { id: leftover.id } });
  };

  before(async () => {
    await cleanupLeftovers();
    const reg = await request(app).post('/api/auth/register').send(admin);
    adminId = reg.body.user.id;
    await prisma.user.update({ where: { id: adminId }, data: { role: 'ADMIN' } });
    const login = await request(app).post('/api/auth/login').send({ email: admin.email, password: admin.password });
    adminToken = login.body.tokens.accessToken;

    const category = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Тестова категорія ${Date.now()}` });
    categoryId = category.body.id;

    const warehouse = await request(app)
      .post('/api/warehouses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Тестовий склад ${Date.now()}`, location: 'Львів' });
    warehouseId = warehouse.body.id;

    const product = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: `LOW-${Date.now()}`,
        name: 'Товар з низьким залишком',
        price: 100,
        categoryId,
        minStock: 10,
      });
    productId = product.body.id;
  });

  after(async () => {
    await prisma.notification.deleteMany({ where: { userId: adminId } });
    await prisma.stockMovement.deleteMany({ where: { productId } }).catch(() => {});
    await prisma.product.delete({ where: { id: productId } }).catch(() => {});
    await prisma.warehouse.delete({ where: { id: warehouseId } }).catch(() => {});
    await prisma.category.delete({ where: { id: categoryId } }).catch(() => {});
    await cleanupLeftovers();
  });

  test('надходження нижче мінімуму створює LOW_STOCK сповіщення з високим пріоритетом', async () => {
    const movement = await request(app)
      .post('/api/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'INBOUND', productId, warehouseId, quantity: 5 });
    assert.equal(movement.status, 201);

    const found = await waitForNotification(
      (n) => n.type === 'LOW_STOCK' && n.data?.productId === productId,
      5000,
      adminToken,
    );
    assert.ok(found, 'LOW_STOCK сповіщення не з\'явилося за 5 секунд');
    assert.ok(['HIGH', 'CRITICAL'].includes(found.priority));
    assert.equal(found.data.minStock, 10);
    assert.equal(found.data.totalQuantity, 5);
    assert.equal(found.data.deficit, 5);
  });

  test('списання понад залишок відхиляється (409)', async () => {
    const res = await request(app)
      .post('/api/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'OUTBOUND', productId, warehouseId, quantity: 100 });
    assert.equal(res.status, 409);
  });
});
