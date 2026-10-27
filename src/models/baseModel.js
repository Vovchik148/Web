const prisma = require("../utils/prisma");
const safeDelete = require("../utils/safeDelete");

// Фабрика CRUD-моделі для простих сутностей (Category, Supplier, Warehouse).
// Уся робота з БД через Prisma ORM зосереджена тут, а не в контролерах.
const createBaseModel = (
  modelName,
  { include, orderBy = { id: "asc" }, searchFields = [] } = {},
) => {
  const delegate = prisma[modelName];

  const buildWhere = (search) =>
    search && searchFields.length
      ? { OR: searchFields.map((f) => ({ [f]: { contains: search, mode: "insensitive" } })) }
      : {};

  return {
    findMany: ({ search, skip, take } = {}) =>
      delegate.findMany({ where: buildWhere(search), include, orderBy, skip, take }),

    count: ({ search } = {}) => delegate.count({ where: buildWhere(search) }),

    findById: (id) => delegate.findUnique({ where: { id }, include }),

    create: (data) => delegate.create({ data, include }),

    update: (id, data) => delegate.update({ where: { id }, data, include }),

    remove: (id) => safeDelete(() => delegate.delete({ where: { id } }), modelName),
  };
};

module.exports = createBaseModel;
