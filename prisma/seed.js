require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Заповнення бази тестовими даними...");

  // Очищаємо таблиці (спочатку залежні)
  await prisma.stockMovement.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.category.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.user.deleteMany();

  // --- Користувачі ---
  const [admin, manager, worker] = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@warehouse.com",
        password: await bcrypt.hash("Admin123", 12),
        firstName: "Олег",
        lastName: "Адміненко",
        role: "ADMIN",
      },
    }),
    prisma.user.create({
      data: {
        email: "manager@warehouse.com",
        password: await bcrypt.hash("Manager123", 12),
        firstName: "Марія",
        lastName: "Коваленко",
        role: "MANAGER",
      },
    }),
    prisma.user.create({
      data: {
        email: "worker@warehouse.com",
        password: await bcrypt.hash("Worker123", 12),
        firstName: "Іван",
        lastName: "Петренко",
        role: "WORKER",
      },
    }),
  ]);

  // --- Категорії ---
  const [electronics, tools, office] = await Promise.all([
    prisma.category.create({ data: { name: "Електроніка", description: "Комплектуючі та пристрої" } }),
    prisma.category.create({ data: { name: "Інструменти", description: "Ручний та електроінструмент" } }),
    prisma.category.create({ data: { name: "Канцелярія", description: "Витратні матеріали для офісу" } }),
  ]);

  // --- Постачальники ---
  const [techSupply, toolMaster] = await Promise.all([
    prisma.supplier.create({
      data: { name: "ТехПостач", email: "sales@techpostach.ua", phone: "+380441234567", address: "м. Київ, вул. Промислова, 5" },
    }),
    prisma.supplier.create({
      data: { name: "ІнструментМайстер", email: "order@instrument.ua", phone: "+380322223344", address: "м. Львів, вул. Зелена, 12" },
    }),
  ]);

  // --- Склади ---
  const [mainWh, reserveWh] = await Promise.all([
    prisma.warehouse.create({ data: { name: "Центральний склад", location: "м. Київ, вул. Складська, 1", capacity: 5000 } }),
    prisma.warehouse.create({ data: { name: "Резервний склад", location: "м. Львів, вул. Логістична, 7", capacity: 2000 } }),
  ]);

  // --- Товари ---
  const products = await Promise.all([
    prisma.product.create({
      data: { sku: "EL-0001", name: "Мікроконтролер ESP32", description: "Wi-Fi/Bluetooth модуль", price: 245.5, minStock: 20, categoryId: electronics.id, supplierId: techSupply.id },
    }),
    prisma.product.create({
      data: { sku: "EL-0002", name: "Блок живлення 12V 5A", price: 389, minStock: 10, categoryId: electronics.id, supplierId: techSupply.id },
    }),
    prisma.product.create({
      data: { sku: "TL-0001", name: "Викрутка хрестова PH2", price: 85, minStock: 30, categoryId: tools.id, supplierId: toolMaster.id },
    }),
    prisma.product.create({
      data: { sku: "TL-0002", name: "Шуруповерт 18V", price: 2450, minStock: 5, categoryId: tools.id, supplierId: toolMaster.id },
    }),
    prisma.product.create({
      data: { sku: "OF-0001", name: "Папір A4 (500 арк.)", unit: "пач", price: 215, minStock: 50, categoryId: office.id },
    }),
  ]);

  // --- Початкові надходження (залишки + журнал руху) ---
  const initial = [
    [0, mainWh, 120], [0, reserveWh, 40],
    [1, mainWh, 8],   // нижче minStock (10) - потрапить у /api/stock/low
    [2, mainWh, 200],
    [3, mainWh, 15],  [3, reserveWh, 4],
    [4, mainWh, 300],
  ];

  for (const [index, warehouse, quantity] of initial) {
    await prisma.stock.create({ data: { productId: products[index].id, warehouseId: warehouse.id, quantity } });
    await prisma.stockMovement.create({
      data: {
        type: "INBOUND",
        quantity,
        note: "Початкове оприбуткування",
        productId: products[index].id,
        warehouseId: warehouse.id,
        userId: manager.id,
      },
    });
  }

  // Одне відвантаження для прикладу
  await prisma.stock.updateMany({
    where: { productId: products[2].id, warehouseId: mainWh.id },
    data: { quantity: { decrement: 25 } },
  });
  await prisma.stockMovement.create({
    data: { type: "OUTBOUND", quantity: 25, note: "Відвантаження за замовленням №1001", productId: products[2].id, warehouseId: mainWh.id, userId: worker.id },
  });

  console.log(`✅ Користувачі: 3, категорії: 3, постачальники: 2, склади: 2, товари: ${products.length}`);
  console.log("\n🔑 Облікові записи:");
  console.log("   ADMIN   admin@warehouse.com   / Admin123");
  console.log("   MANAGER manager@warehouse.com / Manager123");
  console.log("   WORKER  worker@warehouse.com  / Worker123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
