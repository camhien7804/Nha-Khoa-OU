// backend/utils/mailer.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: false, // true nếu dùng cổng 465
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export const sendMail = async ({ to, subject, html, attachments = [] }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || `"Phòng khám Nha khoa" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
      attachments,
    });

    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error("❌ Error sending email:", err);
    throw err;
  }
};
