import nodemailer from "nodemailer";

// Транспорт листів:
// - якщо в .env задані SMTP_HOST і SMTP_USER - використовуємо реальний SMTP;
// - інакше (розробка/тести) - тестовий акаунт Ethereal: листи НЕ доставляються
//   справжнім отримувачам, а переглядаються за посиланням-прев'ю в консолі.
let cachedTransporter = null;

const getTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    return cachedTransporter;
  }

  // Тестовий акаунт Ethereal (створюється один раз і кешується)
  const testAccount = await nodemailer.createTestAccount();
  cachedTransporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  console.log(`[mailer] SMTP не налаштовано - використовується тестова скринька Ethereal (${testAccount.user})`);
  return cachedTransporter;
};

// Останні листи, надіслані через Ethereal (лише для розробки та тестів).
// У тестах звідси береться сирий токен скидання пароля.
export const devOutbox = [];

export const sendMail = async (options) => {
  try {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || '"Warehouse Inventory API" <no-reply@warehouse.local>',
      ...options,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      devOutbox.push({
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        previewUrl,
        sentAt: new Date(),
      });
      if (devOutbox.length > 50) devOutbox.shift(); // не даємо масиву рости необмежено
      console.log(`[mailer] Лист збережено в Ethereal, перегляд: ${previewUrl}`);
    }

    return info;
  } catch (error) {
    // Немає з'єднання з Ethereal (офлайн) і SMTP не налаштований: у режимі
    // розробки не падаємо, а зберігаємо лист у devOutbox - ним користуються тести
    if (!process.env.SMTP_HOST) {
      devOutbox.push({
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        previewUrl: null,
        sentAt: new Date(),
      });
      if (devOutbox.length > 50) devOutbox.shift();
      console.error(`[mailer] Ethereal недоступний (${error.message}), лист збережено локально в devOutbox`);
      return null;
    }
    throw error;
  }
};
