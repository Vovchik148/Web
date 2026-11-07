import { prisma } from "../db.js";

// Публічні поля журналу аудиту
const publicSelect = {
  id: true,
  userId: true,
  action: true,
  entity: true,
  entityId: true,
  ip: true,
  details: true,
  createdAt: true,
  user: { select: { email: true, firstName: true, lastName: true } },
};

export default {
  findMany: ({ where, skip, take }) =>
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      select: publicSelect,
      orderBy: { createdAt: "desc" },
    }),

  count: (where) => prisma.auditLog.count({ where }),
};
