import nodemailer from "nodemailer";

function getRequiredSetting(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export async function sendOutreachEmail({ to, subject, text }) {
  const username = getRequiredSetting("OUTREACH_SMTP_USER");
  const password = getRequiredSetting("OUTREACH_SMTP_PASSWORD");
  const from = getRequiredSetting("OUTREACH_FROM_EMAIL");
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: username, pass: password }
  });

  const result = await transporter.sendMail({ from, to, subject, text });
  return { providerMessageId: result.messageId || null };
}
