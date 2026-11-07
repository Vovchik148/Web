// Мапа «роль → дозволи». Дозвіл - рядок виду "<сутність>:<операція>".
// Це гнучкіша заміна перевірки ролей (authorize): маршрут вимагає дозвіл,
// а не конкретну роль, тому нові ролі або зміни матриці доступу
// робляться в одному місці - тут.

export const PERMISSIONS = {
  // Товари
  PRODUCTS_READ: "products:read",
  PRODUCTS_WRITE: "products:write",
  PRODUCTS_DELETE: "products:delete",
  // Категорії, постачальники, склади
  CATALOG_WRITE: "catalog:write",
  CATALOG_DELETE: "catalog:delete",
  // Залишки та рухи
  STOCK_READ: "stock:read",
  STOCK_WRITE: "stock:write",
  // Користувачі
  USERS_READ: "users:read",
  USERS_MANAGE: "users:manage",
  // Файли
  FILES_READ: "files:read",
  FILES_WRITE: "files:write",
  FILES_DELETE: "files:delete",
  // Журнал аудиту
  AUDIT_READ: "audit:read",
};

const WORKER = [
  PERMISSIONS.PRODUCTS_READ,
  PERMISSIONS.STOCK_READ,
  PERMISSIONS.STOCK_WRITE, // реєструє надходження/відвантаження
  PERMISSIONS.FILES_READ,
  PERMISSIONS.FILES_WRITE,
];

const MANAGER = [
  ...WORKER,
  PERMISSIONS.PRODUCTS_WRITE,
  PERMISSIONS.CATALOG_WRITE,
  PERMISSIONS.FILES_DELETE,
];

const ADMIN = [
  ...MANAGER,
  PERMISSIONS.PRODUCTS_DELETE,
  PERMISSIONS.CATALOG_DELETE,
  PERMISSIONS.USERS_READ,
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.AUDIT_READ,
];

export const ROLE_PERMISSIONS = {
  WORKER,
  MANAGER,
  ADMIN,
};

// Чи має роль заданий дозвіл
export const hasPermission = (role, permission) => {
  const list = ROLE_PERMISSIONS[role];
  if (!list) return false;
  return list.includes("*") || list.includes(permission);
};
