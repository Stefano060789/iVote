import { afterEach, describe, expect, it, vi } from "vitest";
import nodemailer from "nodemailer";
import { sendOutreachEmail } from "./outreachMailer.js";

vi.mock("nodemailer", () => ({
  default: { createTransport: vi.fn() }
}));

describe("sendOutreachEmail", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("requires the Gmail SMTP password", async () => {
    process.env.OUTREACH_SMTP_USER = "hellogodwit@gmail.com";
    delete process.env.OUTREACH_SMTP_PASSWORD;
    delete process.env.OUTREACH_FROM_EMAIL;

    await expect(sendOutreachEmail({ to: "test@example.com", subject: "Test", text: "Body" }))
      .rejects.toThrow("OUTREACH_SMTP_PASSWORD is not configured.");
  });

  it("always authenticates and sends as the Godwit Gmail account", async () => {
    delete process.env.OUTREACH_SMTP_USER;
    process.env.OUTREACH_SMTP_PASSWORD = "app-password";
    process.env.OUTREACH_FROM_EMAIL = "another@example.com";
    const sendMail = vi.fn().mockResolvedValue({ messageId: "gmail-message-123" });
    nodemailer.createTransport.mockReturnValue({ sendMail });

    await expect(sendOutreachEmail({
      to: "venue@example.com",
      subject: "Godwit pilot",
      text: "A short introduction."
    })).resolves.toEqual({ providerMessageId: "gmail-message-123" });

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: "hellogodwit@gmail.com", pass: "app-password" }
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: "hellogodwit@gmail.com",
      to: "venue@example.com",
      subject: "Godwit pilot",
      text: "A short introduction."
    });
  });
});
