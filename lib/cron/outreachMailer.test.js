import { afterEach, describe, expect, it, vi } from "vitest";
import { sendOutreachEmail } from "./outreachMailer.js";

describe("sendOutreachEmail", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it("requires all Gmail SMTP settings", async () => {
    process.env.OUTREACH_SMTP_USER = "hellogodwit@gmail.com";
    process.env.OUTREACH_FROM_EMAIL = "hellogodwit@gmail.com";
    delete process.env.OUTREACH_SMTP_PASSWORD;

    await expect(sendOutreachEmail({ to: "test@example.com", subject: "Test", text: "Body" }))
      .rejects.toThrow("OUTREACH_SMTP_PASSWORD is not configured.");
  });
});
