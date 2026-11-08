import { prisma } from "../db.js";
import ApiError from "../utils/ApiError.js";

const movementInclude = {
  product: { select: { id: true, sku: true, name: true } },
  warehouse: { select: { id: true, name: true } },
  user: { select: { id: true, firstName: true, lastName: true } },
};

export default {
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

  findStock: (productId, warehouseId) =>
    prisma.stock.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    }),

  // Сумарний залишок товару по всіх складах (для перевірки мінімального залишку)
  getTotalQuantity: (productId) =>
    prisma.stock.aggregate({ where: { productId }, _sum: { quantity: true } }),

  findProductForStockCheck: (productId) =>
    prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sku: true, name: true, unit: true, minStock: true },
    }),

  /**
   * Товари із залишком нижче мінімального - «сирим» SQL одним агрегатним
   * запитом (оптимізація). Попередня реалізація завантажувала ВСІ товари
   * разом із залишками (include stocks) і фільтрувала в JS: база віддавала
   * набагато більше даних, ніж потрібно. Тут фільтрація і агрегація
   * виконуються на рівні PostgreSQL (JOIN + GROUP BY + HAVING).
   */
  findLowStockProducts: () =>
    prisma.$queryRaw`
      SELECT
        p.id,
        p.sku,
        p.name,
        p.unit,
        p."minStock",
        COALESCE(SUM(s.quantity), 0)::int AS "totalQuantity",
        p."minStock" - COALESCE(SUM(s.quantity), 0)::int AS deficit
      FROM products p
      LEFT JOIN stocks s ON s.product_id = p.id
      WHERE p."isActive" = true AND p."minStock" > 0
      GROUP BY p.id
      HAVING COALESCE(SUM(s.quantity), 0) < p."minStock"
      ORDER BY deficit DESC
    `,

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
