import { prisma } from "../db.js";

// Поля, які можна віддавати клієнту (без пароля)
const publicSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  twoFactorEnabled: true, // сам секрет twoFactorSecret ніколи не віддаємо клієнту
  createdAt: true,
  updatedAt: true,
};

export default {
  findByEmail: (email) => prisma.user.findUnique({ where: { email } }),

  // З хешем пароля - лише для перевірки/зміни пароля
  findByIdWithPassword: (id) => prisma.user.findUnique({ where: { id } }),

  findById: (id) => prisma.user.findUnique({ where: { id }, select: publicSelect }),

  findMany: ({ where, skip, take }) =>
    prisma.user.findMany({ where, skip, take, select: publicSelect, orderBy: { createdAt: "desc" } }),

  count: (where) => prisma.user.count({ where }),

  create: (data) => prisma.user.create({ data, select: publicSelect }),

  update: (id, data) => prisma.user.update({ where: { id }, data, select: publicSelect }),
};
