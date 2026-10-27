const prisma = require("../utils/prisma");
const ApiError = require("../utils/ApiError");

const movementInclude = {
  product: { select: { id: true, sku: true, name: true } },
  warehouse: { select: { id: true, name: true } },
  user: { select: { id: true, firstName: true, lastName: true } },
};

module.exports = {
  // ---- Залишки ----
  findStocks: ({ where, skip, take }) =>
    prisma.stock.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: "desc" },
      include: {
        product: { select: { id: true, sku: true, name: true, unit: true, minStock: true } },
        warehouse: { select: { id: true, name: true } },
      },
    }),

  countStocks: (where) => prisma.stock.count({ where }),

  // ---- Журнал руху ----
  findMovements: ({ where, skip, take }) =>
    prisma.stockMovement.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: movementInclude,
    }),

  countMovements: (where) => prisma.stockMovement.count({ where }),

  findMovementById: (id) =>
    prisma.stockMovement.findUnique({ where: { id }, include: movementInclude }),

  /**
   * Реєструє рух товару і змінює залишок в ОДНІЙ транзакції:
   * або виконаються обидві дії, або жодна.
   */
  applyMovement: ({ type, quantity, productId, warehouseId, userId, note }) =>
    prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new ApiError(404, "Товар не знайдено");
      if (!product.isActive && type === "INBOUND") {
        throw new ApiError(409, "Не можна оприбутковувати неактивний товар");
      }

      const warehouse = await tx.warehouse.findUnique({ where: { id: warehouseId } });
      if (!warehouse) throw new ApiError(404, "Склад не знайдено");

      // OUTBOUND зменшує залишок; INBOUND збільшує; ADJUSTMENT вже має знак
      const delta = type === "OUTBOUND" ? -quantity : quantity;

      if (delta < 0) {
        // Атомарне списання: оновлюємо рядок, лише якщо залишку достатньо
        // (захист від «мінусових» залишків навіть при одночасних запитах)
        const result = await tx.stock.updateMany({
          where: { productId, warehouseId, quantity: { gte: -delta } },
          data: { quantity: { decrement: -delta } },
        });
        if (result.count === 0) {
          throw new ApiError(409, "Недостатньо товару на обраному складі");
        }
      } else {
        await tx.stock.upsert({
          where: { productId_warehouseId: { productId, warehouseId } },
          update: { quantity: { increment: delta } },
          create: { productId, warehouseId, quantity: delta },
        });
      }

      return tx.stockMovement.create({
        data: { type, quantity, note, productId, warehouseId, userId },
        include: movementInclude,
      });
    }),
};
