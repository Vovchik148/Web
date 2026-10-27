const prisma = require("../utils/prisma");
const safeDelete = require("../utils/safeDelete");

const listInclude = {
  category: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
  stocks: { select: { quantity: true } },
};

const detailInclude = {
  category: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
  stocks: {
    select: { quantity: true, updatedAt: true, warehouse: { select: { id: true, name: true } } },
  },
};

module.exports = {
  findMany: ({ where, skip, take, orderBy }) =>
    prisma.product.findMany({ where, include: listInclude, skip, take, orderBy }),

  count: (where) => prisma.product.count({ where }),

  findById: (id) => prisma.product.findUnique({ where: { id }, include: detailInclude }),

  create: (data) => prisma.product.create({ data, include: listInclude }),

  update: (id, data) => prisma.product.update({ where: { id }, data, include: listInclude }),

  remove: (id) => safeDelete(() => prisma.product.delete({ where: { id } }), "product"),

  // Товари з увімкненим контролем мінімального залишку
  findAllWithMinStock: () =>
    prisma.product.findMany({
      where: { isActive: true, minStock: { gt: 0 } },
      include: listInclude,
      orderBy: { name: "asc" },
    }),
};
