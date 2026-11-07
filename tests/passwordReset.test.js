// Тести п. 1 (відновлення пароля). Для розробки пошта йде в Ethereal,
// тому сирий токен беремо з devOutbox у mailer (лише для тестів).
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { devOutbox } from '../src/utils/mailer.js';
import { prisma } from '../src/db.js';

const user = { email: 'reset-test@example.com', password: 'OldPassword123', firstName: 'Reset', lastName: 'Test' };

const getLastToken = () => {
  const mail = [...devOutbox].reverse().find((m) => m.to === user.email);
  assert.ok(mail, 'лист для відновлення знайдено в devOutbox');
  const match = mail.text.match(/token=([a-f0-9]{64})/);
  assert.ok(match, 'лист містить токен скидання');
  return match[1];
};

describe('Password reset (п. 1)', () => {
  before(async () => {
    await prisma.user.deleteMany({ where: { email: user.email } });
    await request(app).post('/api/auth/register').send(user);
  });

  after(async () => {
    await prisma.user.deleteMany({ where: { email: user.email } });
    await prisma.passwordResetToken.deleteMany({});
    await prisma.$disconnect();
  });

  test('forgot-password для неіснуючого email - завжди 200', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'ghost@example.com' });
    assert.equal(res.status, 200);
    assert.ok(res.body.message);
  });

  test('forgot-password для існуючого email теж 200 і однакова відповідь', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: user.email });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.message, (await request(app).post('/api/auth/forgot-password').send({ email: 'ghost@example.com' })).body.message);
  });

  test('reset-password з протухшим/винайденим токеном - 400', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'a'.repeat(64), password: 'NewPassword123' });
    assert.equal(res.status, 400);
  });

  test('повний потік: forgot → reset → вхід із новим паролем', async () => {
    // 1. Запит листа
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: user.email });
    assert.equal(forgot.status, 200);

    const token = getLastToken();

    // 2. Скидання пароля
    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'NewPassword456' });
    assert.equal(reset.status, 200);

    // 3. Старий пароль більше не працює
    assert.equal(
      (await request(app).post('/api/auth/login').send({ email: user.email, password: user.password })).status,
      401,
    );

    // 4. Новий працює
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: 'NewPassword456' });
    assert.equal(login.status, 200);
    assert.ok(login.body.tokens.accessToken);
  });

  test('токен одноразовий', async () => {
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: user.email });
    assert.equal(forgot.status, 200);
    const token = getLastToken();

    const first = await request(app).post('/api/auth/reset-password').send({ token, password: 'NewPassword456' });
    assert.equal(first.status, 200);

    const second = await request(app).post('/api/auth/reset-password').send({ token, password: 'HackedPass123' });
    assert.equal(second.status, 400);
  });

  test('після скидання пароля відкликаються всі refresh-токени', async () => {
    // Логінимося і тримаємо refresh-токен
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: 'NewPassword456' });
    const { refreshToken } = login.body.tokens;

    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: user.email });
    const token = getLastToken();
    await request(app).post('/api/auth/reset-password').send({ token, password: 'FinalPass123' });

    // Старий refresh-токен більше не працює
    const refresh = await request(app).post('/api/auth/refresh').send({ refreshToken });
    assert.equal(refresh.status, 401);
  });
});
