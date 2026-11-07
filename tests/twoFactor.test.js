// Тести п. 2: двофакторна автентифікація (TOTP)
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { authenticator } from 'otplib';
import app from '../src/app.js';
import { prisma } from '../src/db.js';

const user = { email: 'twofa-test@example.com', password: 'TestPassword123', firstName: 'Two', lastName: 'Factor' };

describe('Two-factor authentication (п. 2)', () => {
  let token;
  let secret;

  before(async () => {
    await prisma.user.deleteMany({ where: { email: user.email } });
    const res = await request(app).post('/api/auth/register').send(user);
    token = res.body.tokens.accessToken;
  });

  after(async () => {
    await prisma.user.deleteMany({ where: { email: user.email } });
    await prisma.$disconnect();
  });

  test('без токена setup 401', async () => {
    assert.equal((await request(app).post('/api/auth/2fa/setup')).status, 401);
  });

  test('setup повертає секрет, otpauth-URL і QR-код', async () => {
    const res = await request(app).post('/api/auth/2fa/setup').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.secret.length >= 16);
    assert.match(res.body.otpauthUrl, /^otpauth:\/\/totp\//);
    assert.match(res.body.qrCodeDataUrl, /^data:image\/png;base64,/);
    secret = res.body.secret;
  });

  test('enable з невірним кодом - 400, 2FA ще не вмикається', async () => {
    const res = await request(app).post('/api/auth/2fa/enable').set('Authorization', `Bearer ${token}`).send({ code: '000000' });
    assert.equal(res.status, 400);
    const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
    assert.equal(dbUser.twoFactorEnabled, false);
  });

  test('enable з правильним кодом - 200', async () => {
    const code = authenticator.generate(secret);
    const res = await request(app).post('/api/auth/2fa/enable').set('Authorization', `Bearer ${token}`).send({ code });
    assert.equal(res.status, 200);
    const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
    assert.equal(dbUser.twoFactorEnabled, true);
  });

  test('login тепер вимагає код: twoFactorRequired + tempToken', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    assert.equal(res.status, 200);
    assert.equal(res.body.twoFactorRequired, true);
    assert.ok(res.body.tempToken);
    assert.equal(res.body.tokens, undefined, 'повні токени НЕ повертаються до перевірки кода');
  });

  test('verify з невірним кодом - 401', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    const res = await request(app).post('/api/auth/2fa/verify').send({ tempToken: login.body.tempToken, code: '111111' });
    assert.equal(res.status, 401);
  });

  test('verify з правильним кодом повертає повну пару токенів', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    const code = authenticator.generate(secret);
    const res = await request(app).post('/api/auth/2fa/verify').send({ tempToken: login.body.tempToken, code });
    assert.equal(res.status, 200);
    assert.ok(res.body.tokens.accessToken);
    assert.ok(res.body.tokens.refreshToken);
  });

  test('verify з простроченим/фальшивим tempToken - 401', async () => {
    const res = await request(app).post('/api/auth/2fa/verify').send({ tempToken: 'fake.token.here', code: '123456' });
    assert.equal(res.status, 401);
  });

  test('disable вимагає код і після нього вхід знову одноетапний', async () => {
    const bad = await request(app).post('/api/auth/2fa/disable').set('Authorization', `Bearer ${token}`).send({ code: '999999' });
    assert.equal(bad.status, 400);

    const code = authenticator.generate(secret);
    const ok = await request(app).post('/api/auth/2fa/disable').set('Authorization', `Bearer ${token}`).send({ code });
    assert.equal(ok.status, 200);

    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    assert.equal(login.status, 200);
    assert.ok(login.body.tokens.accessToken);
    assert.equal(login.body.twoFactorRequired, undefined);
  });
});
