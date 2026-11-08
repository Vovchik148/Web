import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { io as connect } from 'socket.io-client';
import request from 'supertest';
import app from '../src/app.js';
import { initSocket, closeSocketAdapter } from '../src/socket/index.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { closeRedis } from '../src/utils/cache.js';
import { prisma } from '../src/db.js';

// HTTP-сервер + Socket.io на випадковому порту (як у прикладі з методички)
const httpServer = createServer(app);
const io = initSocket(httpServer);
app.set('io', io);
httpServer.listen(0);
await once(httpServer, 'listening');
const url = `http://localhost:${httpServer.address().port}`;
const clients = [];

const clientFor = (userId, role = 'USER') => {
  const client = connect(url, {
    auth: { token: generateAccessToken(userId, role) },
    reconnection: false,
  });
  clients.push(client);
  return client;
};

after(async () => {
  clients.forEach((c) => c.close());
  io.close();
  await closeSocketAdapter(); // Redis pub/sub адаптера
  await new Promise((resolve) => httpServer.close(resolve)); // HTTP-сервер
  await closeRedis(); // Redis-з'єднання кеша (створюється контролерами з кешуванням)
  await prisma.$disconnect();
});

describe('WebSocket (Socket.io)', () => {
  test('підключення без токена відхиляється', async () => {
    const client = connect(url, { auth: {}, reconnection: false });
    clients.push(client);
    const [error] = await once(client, 'connect_error');
    assert.equal(error.message, 'unauthorized');
  });

  test('підключення з невалідним токеном відхиляється', async () => {
    const client = connect(url, { auth: { token: 'не-токен' }, reconnection: false });
    clients.push(client);
    const [error] = await once(client, 'connect_error');
    assert.equal(error.message, 'unauthorized');
  });

  test('кімнати та персональні сповіщення', async () => {
    const alice = clientFor(1);
    const bob = clientFor(2);
    await Promise.all([once(alice, 'connect'), once(bob, 'connect')]);

    await alice.emitWithAck('room:join', 'warehouse:7');

    // Подія в кімнату отримує лише той, хто до неї приєднався
    const got = once(alice, 'stock:updated');
    let bobGot = false;
    bob.on('stock:updated', () => (bobGot = true));
    io.to('warehouse:7').emit('stock:updated', { productId: 5, quantity: 10 });
    const [payload] = await got;
    assert.equal(payload.productId, 5);

    // Персональне сповіщення надходить лише власнику кімнати user:<id>
    const personal = once(bob, 'notification');
    io.to('user:2').emit('notification', { text: 'привіт' });
    assert.deepEqual((await personal)[0], { text: 'привіт' });
    assert.equal(bobGot, false);
  });

  test('невідома кімната відхиляється', async () => {
    const alice = clientFor(1);
    await once(alice, 'connect');

    const res = await alice.emitWithAck('room:join', 'project:7');
    assert.equal(res.ok, false);
    assert.equal(res.error, 'unknown_room');
  });

  test('онлайн-статус: нове підключення видно всім у кімнаті presence', async () => {
    // Унікальні id: клієнти попередніх тестів ще підключені, а presence
    // рахує користувача онлайн, доки у нього є хоч один сокет
    const alice = clientFor(11);
    // presence:list приходить одразу після connect - слухача вішаємо заздалегідь
    const listPromise = once(alice, 'presence:list');
    await once(alice, 'connect');
    await listPromise;

    const bob = clientFor(12);
    // Слухача вішаємо ДО підключення: подія presence:update прилітає
    // на alice одразу з серверним connect'ом bob'а, раніше за локальний "connect"
    const updatePromise = once(alice, 'presence:update');
    await once(bob, 'connect');

    // Alice має дізнатися, що bob вийшов у мережу
    const [update] = await updatePromise;
    assert.equal(update.userId, 12);
    assert.equal(update.online, true);
  });

  test('events:sync повертає пропущені події кімнати', async () => {
    const client = clientFor(3);
    await once(client, 'connect');
    await client.emitWithAck('room:join', 'warehouse:42');

    // Публікуємо подію через сервіс (запис в історію event_logs + розсилка)
    const { publishEvent } = await import('../src/services/realtime.js');
    const event = await publishEvent('warehouse:42', 'stock:updated', { productId: 1, quantity: 7 });
    assert.ok(event._seq > 0);

    // Клієнт "пропустив" подію: запитує все, що сталося після попереднього seq.
    // Слухача вішаємо до запиту: сервер надсилає події перед ack
    const missedPromise = once(client, 'stock:updated');
    const ack = await client.emitWithAck('events:sync', event._seq - 1);
    assert.equal(ack.ok, true);
    assert.ok(ack.count >= 1);

    const [missed] = await missedPromise;
    assert.equal(missed.quantity, 7);
    assert.equal(missed._seq, event._seq);
    assert.equal(missed._room, 'warehouse:42');
  });

  test('rate limiting: шторм подій відкидається', async () => {
    const client = clientFor(4);
    await once(client, 'connect');

    const errorPromise = once(client, 'error');
    // Швидко надсилаємо понад WS_RATE_LIMIT_EVENTS (30) подій
    for (let i = 0; i < 50; i += 1) {
      client.emit('room:join', 'products', () => {});
    }
    const [err] = await errorPromise;
    assert.match(err.message, /Забагато подій/);
  });

  test('реальний час: створення товару через REST приходить у кімнату products', async () => {
    // Готуємо адміністратора через REST API
    const admin = {
      email: 'socket-admin@example.com',
      password: 'TestPassword123',
      firstName: 'Socket',
      lastName: 'Admin',
    };
    await prisma.user.deleteMany({ where: { email: admin.email } });
    const reg = await request(app).post('/api/auth/register').send(admin);
    await prisma.user.update({ where: { id: reg.body.user.id }, data: { role: 'ADMIN' } });
    const login = await request(app).post('/api/auth/login').send({ email: admin.email, password: admin.password });
    const token = login.body.tokens.accessToken;

    // Клієнт підключається і приєднується до кімнати каталогу
    const client = clientFor(reg.body.user.id, 'ADMIN');
    await once(client, 'connect');
    await client.emitWithAck('room:join', 'products');

    // Створюємо категорію і товар через REST
    const category = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Категорія WS ${Date.now()}` });
    assert.equal(category.status, 201);

    const created = once(client, 'product:created');
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sku: `WS-TEST-${Date.now()}`,
        name: 'Товар для WebSocket-тесту',
        price: 99.99,
        categoryId: category.body.id,
        minStock: 5,
      });
    assert.equal(res.status, 201);

    const [event] = await created;
    assert.equal(event.sku, res.body.sku);
    assert.ok(event._seq > 0);

    // Прибираємо за собою
    await request(app).delete(`/api/products/${res.body.id}`).set('Authorization', `Bearer ${token}`);
    await prisma.category.delete({ where: { id: category.body.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: admin.email } });
  });
});
