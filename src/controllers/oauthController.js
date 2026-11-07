import { randomBytes } from "node:crypto";
import config from "../utils/config.js";
import { prisma } from "../db.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { hashPassword } from "../utils/password.js";
import { logAction } from "../utils/audit.js";
import { issueTokens } from "./authController.js";

// OAuth GitHub без passport: лише fetch. Потік - Authorization Code.
const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_API = "https://api.github.com";

// Захист від CSRF: перед редиректом генеруємо стан, а в callback перевіряємо,
// що саме ми його видавали. Зберігається в пам'яті процесу (діє 10 хвилин).
const pendingStates = new Map(); // state -> expiresAt (ms)

const cleanupStates = () => {
  const now = Date.now();
  for (const [state, expiresAt] of pendingStates) {
    if (expiresAt < now) pendingStates.delete(state);
  }
};

const requireGithubApp = () => {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    throw new ApiError(
      500,
      "OAuth GitHub не налаштовано: додайте GITHUB_CLIENT_ID і GITHUB_CLIENT_SECRET у .env",
    );
  }
};

// Крок 1: перенаправляємо користувача на сторінку входу GitHub
const githubLogin = (req, res) => {
  requireGithubApp();
  cleanupStates();

  const state = randomBytes(16).toString("hex");
  pendingStates.set(state, Date.now() + 10 * 60 * 1000);

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${config.appUrl}/api/auth/github/callback`,
    scope: "read:user user:email",
    state,
  });

  res.redirect(`${GITHUB_AUTHORIZE_URL}?${params}`);
};

// Крок 2: GitHub повертає code і state, обмінюємо code на access_token,
// отримуємо профіль і ідентифікуємо користувача
const githubCallback = asyncHandler(async (req, res) => {
  const fail = (message) => res.redirect(`${config.frontendUrl}/login?error=${encodeURIComponent(message)}`);

  if (req.query.error) {
    return fail(`GitHub відмовив у доступі: ${req.query.error_description || req.query.error}`);
  }

  const { code, state } = req.query;
  if (!code || !state) return fail("Не отримано код авторизації від GitHub");

  requireGithubApp();

  if (!pendingStates.has(state)) return fail("Недійсний стан (state) - спробуйте увійти знову");
  pendingStates.delete(state);
  cleanupStates();

  // Обмін code -> access_token
  const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${config.appUrl}/api/auth/github/callback`,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    console.error("GitHub OAuth: помилка обміну токена", tokenData);
    return fail("Не вдалося отримати токен від GitHub");
  }

  const headers = {
    Authorization: `Bearer ${tokenData.access_token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Профіль і email-адреси користувача GitHub
  const [profileResponse, emailsResponse] = await Promise.all([
    fetch(`${GITHUB_API}/user`, { headers }),
    fetch(`${GITHUB_API}/user/emails`, { headers }),
  ]);

  const profile = await profileResponse.json();
  if (!profile.id) {
    console.error("GitHub OAuth: не вдалося отримати профіль", profile);
    return fail("Не вдалося отримати профіль GitHub");
  }

  const emails = emailsResponse.ok ? await emailsResponse.json() : [];
  const primaryEmail =
    emails.find((e) => e.primary && e.verified)?.email ||
    emails[0]?.email ||
    `${profile.login}@users.noreply.github.com`;

  // 1. Пошук прив'язки OAuth-акаунта
  const oauthAccount = await prisma.oAuthAccount.findUnique({
    where: { provider_providerAccountId: { provider: "github", providerAccountId: String(profile.id) } },
    include: { user: true },
  });

  let user = oauthAccount?.user;

  if (!user) {
    // 2. Спроба знайти користувача за email і прив'язати GitHub-акаунт до нього
    const existing = await prisma.user.findUnique({ where: { email: primaryEmail } });

    if (existing) {
      user = existing;
      await prisma.oAuthAccount.create({
        data: { provider: "github", providerAccountId: String(profile.id), userId: existing.id },
      });
    } else {
      // 3. Створюємо нового користувача (роль WORKER). Пароль випадковий -
      // увійти за паролем неможливо, лише через OAuth
      const [firstName, ...rest] = (profile.name || profile.login).split(" ");
      user = await prisma.user.create({
        data: {
          email: primaryEmail,
          firstName: firstName || profile.login,
          lastName: rest.join(" ") || "-",
          password: await hashPassword(randomBytes(32).toString("hex")),
          oauthAccounts: {
            create: { provider: "github", providerAccountId: String(profile.id) },
          },
        },
      });
    }
  }

  if (!user.isActive) return fail("Обліковий запис деактивовано");

  logAction(req, "auth.oauth_login", {
    entity: "user",
    entityId: user.id,
    details: { provider: "github", login: profile.login },
  });

  // Видаємо нашу пару JWT і повертаємо користувача на фронтенд
  const tokens = await issueTokens(user);
  const params = new URLSearchParams({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
  res.redirect(`${config.frontendUrl}/oauth/callback?${params}`);
});

export { githubLogin, githubCallback };
