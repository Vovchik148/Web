import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.1.0',
      description: 'Документація API для системи обліку інвентарю на складі',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Development server' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        // --- Спільні ---
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Стандартна назва HTTP-статусу', example: 'Unauthorized' },
            message: { type: 'string', description: 'Людське пояснення помилки' },
            errors: {
              type: 'array',
              description: 'Деталі помилок валідації (лише для 400)',
              items: { $ref: '#/components/schemas/ValidationError' },
            },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            field: { type: 'string', example: 'email' },
            message: { type: 'string', example: 'Вкажіть коректний email' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            total: { type: 'integer', example: 25 },
            pages: { type: 'integer', example: 3 },
          },
        },
        Tokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', description: 'JWT, передається як Authorization: Bearer <token>', example: 'eyJhbGciOiJIUzI1NiIs...' },
            refreshToken: { type: 'string', description: 'Для POST /api/auth/refresh', example: 'eyJhbGciOiJIUzI1NiIs...' },
          },
        },
        // --- Користувачі та автентифікація ---
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            email: { type: 'string', format: 'email', example: 'admin@warehouse.com' },
            firstName: { type: 'string', example: 'Олена' },
            lastName: { type: 'string', example: 'Адмінчук' },
            role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'WORKER'], example: 'ADMIN' },
            isActive: { type: 'boolean', example: true },
            twoFactorEnabled: { type: 'boolean', description: 'Чи увімкнено двофакторну автентифікацію', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthSuccess: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Вхід виконано' },
            user: { $ref: '#/components/schemas/User' },
            tokens: { $ref: '#/components/schemas/Tokens' },
          },
        },
        TwoFactorRequired: {
          type: 'object',
          description: 'Відповідь login при увімкненій 2FA: потрібен код з аутентифікатора',
          properties: {
            message: { type: 'string', example: 'Вкажіть код двофакторної автентифікації' },
            twoFactorRequired: { type: 'boolean', example: true },
            tempToken: { type: 'string', description: 'Короткоживучий токен (~5 хв) для POST /api/auth/2fa/verify' },
          },
        },
        // --- Файли ---
        File: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            filename: { type: 'string', description: 'Імʼя на диску', example: 'file-1730999999999-123456789.png' },
            originalName: { type: 'string', example: 'scheme.png' },
            mimetype: { type: 'string', example: 'image/png' },
            size: { type: 'integer', description: 'Розмір у байтах', example: 20480 },
            uploadedBy: { type: 'integer', example: 1 },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // --- Товари ---
        Product: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            sku: { type: 'string', example: 'EL-0003' },
            name: { type: 'string', example: 'Датчик температури DS18B20' },
            description: { type: 'string', nullable: true },
            unit: { type: 'string', example: 'шт' },
            price: { type: 'string', description: 'Decimal приходить рядком', example: '59.90' },
            minStock: { type: 'integer', example: 25 },
            isActive: { type: 'boolean', example: true },
            categoryId: { type: 'integer', example: 1 },
            supplierId: { type: 'integer', nullable: true, example: 1 },
            category: {
              type: 'object',
              properties: { id: { type: 'integer' }, name: { type: 'string' } },
            },
            supplier: {
              type: 'object',
              nullable: true,
              properties: { id: { type: 'integer' }, name: { type: 'string' } },
            },
            totalQuantity: { type: 'integer', description: 'Сумарний залишок по всіх складах', example: 120 },
          },
        },
        // --- Аудит ---
        AuditLog: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 10 },
            userId: { type: 'integer', nullable: true, description: 'null - дія неавтентифікованого користувача (наприклад, невдалий вхід)' },
            action: { type: 'string', description: '<сутність>.<операція>', example: 'auth.login' },
            entity: { type: 'string', nullable: true, example: 'user' },
            entityId: { type: 'string', nullable: true, example: '1' },
            ip: { type: 'string', nullable: true, example: '::1' },
            details: { type: 'object', nullable: true, description: 'Довільні деталі дії' },
            createdAt: { type: 'string', format: 'date-time' },
            user: {
              type: 'object',
              nullable: true,
              properties: {
                email: { type: 'string', format: 'email' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
              },
            },
          },
        },
      },
      // Коди помилок, спільні для всіх ендпоінтів
      responses: {
        ValidationError: {
          description: 'Помилка валідації даних',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        Unauthorized: {
          description: 'Не авторизовано (немає/протух/недійсний токен)',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        Forbidden: {
          description: 'Недостатньо прав',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        NotFound: {
          description: 'Запис не знайдено',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        TooManyRequests: {
          description: 'Перевищено ліміт запитів (rate limiting)',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

export const swaggerSpecs = swaggerJsdoc(options);
