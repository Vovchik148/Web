import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/db.js';

const user = { email, password: 'TestPassword123', firstName: 'Test', lastName: 'User' };

describe('Authentication API', () => {
  before(() => prisma.user.deleteMany({ where: { email: user.email } }));

  after(async () => {
    await prisma.user.deleteMany({ where: { email: user.email } });
    await prisma.$disconnect();
  });

  test('реєструє нового користувача', async () => {
    const res = await request(app).post('/api/auth/register').send(user);

    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, user.email);
    assert.ok(res.body.tokens.accessToken);
    assert.equal(res.body.user.password, undefined);
  });

  test('не реєструє користувача з існуючим email', async () => {
    const res = await request(app).post('/api/auth/register').send(user);
    assert.equal(res.status, 409);
  });

  test('не реєструє користувача з коротким паролем', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...user, email: 'test2@example.com', password: 'short' });
    assert.equal(res.status, 400);
  });

  test('входить із правильними даними', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });

    assert.equal(res.status, 200);
    assert.ok(res.body.tokens.accessToken);
    assert.ok(res.body.tokens.refreshToken);
  });

  test('не входить із хибним паролем', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrongpassword' });
    assert.equal(res.status, 401);
  });

  test('refresh: ротація токена та відкликання старого', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });
    const { refreshToken } = login.body.tokens;

    const first = await request(app).post('/api/auth/refresh').send({ refreshToken });
    assert.equal(first.status, 200);
    assert.notEqual(first.body.tokens.refreshToken, refreshToken);

    // Старий токен вже відкликано
    const reuse = await request(app).post('/api/auth/refresh').send({ refreshToken });
    assert.equal(reuse.status, 401);

    // Повторне використання відкликаного токена скасовує й нові токени користувача
    const afterReuse = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: first.body.tokens.refreshToken });
    assert.equal(afterReuse.status, 401);
  });

  test('logout відкликає refresh токен', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });
    const { refreshToken } = login.body.tokens;

    assert.equal((await request(app).post('/api/auth/logout').send({ refreshToken })).status, 204);
    assert.equal((await request(app).post('/api/auth/refresh').send({ refreshToken })).status, 401);
  });
});

describe('Files API', () => {
  let token;
  const fileUser = { email, password: 'TestPassword123', firstName: 'Test', lastName: 'User' };
  const png = Buffer.from('89504e470d0a1a0a', 'hex');

  before(async () => {
    await prisma.user.deleteMany({ where: { email: fileUser.email } });
    const res = await request(app).post('/api/auth/register').send(fileUser);
    token = res.body.tokens.accessToken;
  });

  after(async () => {
    await prisma.user.deleteMany({ where: { email: fileUser.email } });
  });

  test('без токена 401', async () => {
    assert.equal((await request(app).post('/api/files/upload')).status, 401);
  });

  test('завантажує PNG, відхиляє .exe та завеликий файл', async () => {
    const auth = { Authorization: `Bearer ${token}` };

    const ok = await request(app)
      .post('/api/files/upload')
      .set(auth)
      .attach('file', png, { filename: 'a.png', contentType: 'image/png' });
    assert.equal(ok.status, 201);

    const bad = await request(app)
      .post('/api/files/upload')
      .set(auth)
      .attach('file', png, { filename: 'a.exe', contentType: 'application/x-msdownload' });
    assert.equal(bad.status, 400);

    const big = await request(app)
      .post('/api/files/upload')
      .set(auth)
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'b.png', contentType: 'image/png' });
    assert.equal(big.status, 400);
    assert.equal(big.body.message, 'Файл занадто великий');

    const get = await request(app).get(`/api/files/${ok.body.file.id}`);
    assert.equal(get.status, 200);

    const del = await request(app).delete(`/api/files/${ok.body.file.id}`).set(auth);
    assert.equal(del.status, 200);
  });
});