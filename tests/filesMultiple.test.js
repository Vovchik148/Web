// Тести п. 2: багатофайлове завантаження POST /api/files/upload-multiple
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/db.js';

const user = { email: 'multi-files@example.com', password: 'TestPassword123', firstName: 'Multi', lastName: 'File' };
const png = Buffer.from('89504e470d0a1a0a', 'hex');

describe('Files API: upload-multiple (п. 7)', () => {
  let token;

  before(async () => {
    await prisma.user.deleteMany({ where: { email: user.email } });
    const res = await request(app).post('/api/auth/register').send(user);
    token = res.body.tokens.accessToken;
  });

  after(async () => {
    await prisma.user.deleteMany({ where: { email: user.email } });
    await prisma.$disconnect();
  });

  test('без токена 401', async () => {
    assert.equal((await request(app).post('/api/files/upload-multiple')).status, 401);
  });

  test('завантажує кілька файлів за один запит', async () => {
    const res = await request(app)
      .post('/api/files/upload-multiple')
      .set('Authorization', `Bearer ${token}`)
      .attach('files', png, { filename: 'one.png', contentType: 'image/png' })
      .attach('files', Buffer.from('%PDF-1.4 test'), { filename: 'two.pdf', contentType: 'application/pdf' });

    assert.equal(res.status, 201);
    assert.equal(res.body.files.length, 2);
    assert.deepEqual(res.body.files.map((f) => f.originalName).sort(), ['one.png', 'two.pdf']);
  });

  test('без файлів повертає 400', async () => {
    const res = await request(app).post('/api/files/upload-multiple').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 400);
  });

  test('відхиляє файл із невалідним типом', async () => {
    const res = await request(app)
      .post('/api/files/upload-multiple')
      .set('Authorization', `Bearer ${token}`)
      .attach('files', png, { filename: 'one.png', contentType: 'image/png' })
      .attach('files', png, { filename: 'evil.exe', contentType: 'application/x-msdownload' });

    assert.equal(res.status, 400);
  });

  test('відхиляє понад 10 файлів', async () => {
    const req = request(app).post('/api/files/upload-multiple').set('Authorization', `Bearer ${token}`);
    for (let i = 0; i < 11; i++) req.attach('files', png, { filename: `f${i}.png`, contentType: 'image/png' });
    const res = await req;
    assert.equal(res.status, 400);
  });
});
