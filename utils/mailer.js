const nodemailer = require("nodemailer");

const requiredMailSettings = ["MAIL_HOST", "MAIL_PORT", "MAIL_USER", "MAIL_PASS"];

const hasMailSettings = () => requiredMailSettings.every((key) => process.env[key]);

const createTransporter = () => {
  if (!hasMailSettings()) {
    throw new Error("Mail settings are missing. Please set MAIL_HOST, MAIL_PORT, MAIL_USER, and MAIL_PASS.");
  }

  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: process.env.MAIL_SECURE === "true",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS.replace(/\s+/g, "")
    }
  });
};

const sendMail = async ({ to, subject, text, html }) => {
  const transporter = createTransporter();

  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to,
    subject,
    text,
    html
  });
};

module.exports = {
  sendMail
};
