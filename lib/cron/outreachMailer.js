import nodemailer from "nodemailer";

export const OUTREACH_GMAIL_ACCOUNT = "hellogodwit@gmail.com";

function getRequiredSetting(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export async function sendOutreachEmail({ to, subject, text }) {
  const username = getRequiredSetting("OUTREACH_SMTP_USER");
  const password = getRequiredSetting("OUTREACH_SMTP_PASSWORD");
  if (username.toLowerCase() !== OUTREACH_GMAIL_ACCOUNT) {
    throw new Error(`OUTREACH_SMTP_USER must be ${OUTREACH_GMAIL_ACCOUNT}.`);
  }
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: username, pass: password }
  });

  const result = await transporter.sendMail({ from: OUTREACH_GMAIL_ACCOUNT, to, subject, text });
  return { providerMessageId: result.messageId || null };
}
