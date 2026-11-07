// Тести п. 3: OAuth GitHub (Authorization Code, без passport).
// Зовнішній HTTP не викликаємо - глобальний fetch підмінюється на фейковий.
// env-змінні задаємо до імпорту app (в ESM статичні імпорти виконуються першими).
process.env.GITHUB_CLIENT_ID = 'test-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';

const { default: app } = await import('../src/app.js');

import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { prisma } from '../src/db.js';

const githubProfile = {
  id: 77_700_001,
  login: 'octocat-lab',
  name: 'Octo Cat',
  email: 'octocat-lab@example.com',
};
const githubEmails = [{ email: githubProfile.email, primary: true, verified: true }];

// Підміна fetch: обмін токена та запити до GitHub API повертають фіксовані відповіді
const mockFetch = async (url) => {
  const fake = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
  if (url === 'https://github.com/login/oauth/access_token') {
    return fake({ access_token: 'gho_mocked_token', token_type: 'bearer' });
  }
  if (url === 'https://api.github.com/user') return fake(githubProfile);
  if (url === 'https://api.github.com/user/emails') return fake(githubEmails);
  return fake({ message: 'Not Found' }, 404);
};

const realFetch = globalThis.fetch;
const cleanup = async () => {
  globalThis.fetch = realFetch;
  await prisma.user.deleteMany({ where: { email: githubProfile.email } });
  await prisma.$disconnect();
};

describe('OAuth GitHub (п. 3)', () => {
  after(cleanup);

  test('без налаштованого client_id - 500', async () => {
    const saved = process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_ID;
    const res = await request(app).get('/api/auth/github');
    assert.equal(res.status, 500);
    process.env.GITHUB_CLIENT_ID = saved;
  });

  test('перенаправляє на GitHub зі state і client_id', async () => {
    const res = await request(app).get('/api/auth/github');
    assert.equal(res.status, 302);

    const redirect = new URL(res.headers.location);
    assert.equal(redirect.hostname, 'github.com');
    assert.equal(redirect.pathname, '/login/oauth/authorize');
    assert.equal(redirect.searchParams.get('client_id'), 'test-client-id');
    assert.ok(redirect.searchParams.get('state'), 'state передано для захисту від CSRF');
    assert.equal(redirect.searchParams.get('scope'), 'read:user user:email');
  });

  test('callback без code/state - редирект на фронтенд з error', async () => {
    globalThis.fetch = mockFetch;
    const res = await request(app).get('/api/auth/github/callback').query({ state: 'невідомий' });
    assert.equal(res.status, 302);
    assert.match(res.headers.location, /login\?error=/);
  });

  test('callback з невірним state відхиляється (CSRF)', async () => {
    globalThis.fetch = mockFetch;
    const res = await request(app).get('/api/auth/github/callback').query({ code: 'abc', state: 'forged-state' });
    assert.equal(res.status, 302);
    assert.match(res.headers.location, /error=/);
  });

  test('повний потік: створює користувача, привʼязує OAuth-акаунт, видає токени', async () => {
    // Крок 1: беремо справжній state із redirect-URL
    const login = await request(app).get('/api/auth/github');
    const state = new URL(login.headers.location).searchParams.get('state');

    // Крок 2: callback з підміненим fetch
    globalThis.fetch = mockFetch;
    const callback = await request(app).get('/api/auth/github/callback').query({ code: 'real-code', state });
    assert.equal(callback.status, 302);
    assert.match(callback.headers.location, /oauth\/callback\?/);

    // Токени в redirect-URL
    const redirect = new URL(callback.headers.location);
    assert.ok(redirect.searchParams.get('accessToken'));
    assert.ok(redirect.searchParams.get('refreshToken'));

    // Користувача створено з роллю WORKER і прив'язкою OAuthAccount
    const dbUser = await prisma.user.findUnique({
      where: { email: githubProfile.email },
      include: { oauthAccounts: true },
    });
    assert.ok(dbUser, 'користувача створено');
    assert.equal(dbUser.role, 'WORKER');
    assert.equal(dbUser.oauthAccounts.length, 1);
    assert.equal(dbUser.oauthAccounts[0].provider, 'github');
    assert.equal(dbUser.oauthAccounts[0].providerAccountId, String(githubProfile.id));

    // Токен дійсний: можна прочитати профіль
    const me = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${redirect.searchParams.get('accessToken')}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.email, githubProfile.email);
  });

  test('повторний вхід не створює дубліката', async () => {
    const login = await request(app).get('/api/auth/github');
    const state = new URL(login.headers.location).searchParams.get('state');

    const callback = await request(app).get('/api/auth/github/callback').query({ code: 'second-code', state });
    assert.equal(callback.status, 302);

    const count = await prisma.oAuthAccount.count({ where: { provider: 'github', providerAccountId: String(githubProfile.id) } });
    assert.equal(count, 1);
  });
});
