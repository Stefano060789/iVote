import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appendOutreachOptOut, isValidOutreachEmail, runSendOutreachEmails } from "./sendOutreachEmailsJob.js";

vi.mock("./outreachMailer.js", () => ({
  sendOutreachEmail: vi.fn(async () => ({ providerMessageId: "gmail_123" }))
}));

const SUPABASE_URL = "https://supabase.test";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("outreach email helpers", () => {
  it("validates only normal email addresses", () => {
    expect(isValidOutreachEmail("OWNER@Example.com")).toBe(true);
    expect(isValidOutreachEmail("missing-dot@example")).toBe(false);
    expect(isValidOutreachEmail("bad address@example.com")).toBe(false);
  });

  it("adds the required plain-text opt-out instruction", () => {
    expect(appendOutreachOptOut("Hello")).toContain("mailto:contact@hellogodwit.com");
  });
});

describe("runSendOutreachEmails", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.OUTREACH_SMTP_USER = "hellogodwit@gmail.com";
    process.env.OUTREACH_SMTP_PASSWORD = "app-password";
    process.env.OUTREACH_FROM_EMAIL = "hellogodwit@gmail.com";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it("sends approved contacts, skips unsafe recipients, and records the Gmail id", async () => {
    const contacts = [
      { id: "00000000-0000-4000-8000-000000000001", contact_email: "not-an-email", subject: "Hi", message: "Invalid" },
      { id: "00000000-0000-4000-8000-000000000002", contact_email: "suppressed@example.com", subject: "Hi", message: "Suppressed" },
      { id: "00000000-0000-4000-8000-000000000003", contact_email: "Guest@Example.com", subject: "Hello", message: "A safe draft." }
    ];
    const requests = [];

    vi.stubGlobal("fetch", vi.fn(async (url, options = {}) => {
      const href = String(url);
      const method = options.method || "GET";
      const body = options.body ? JSON.parse(options.body) : null;
      requests.push({ href, method, body });

      if (href.includes("/rest/v1/creator_outreach_delivery_log?") && method === "GET") return jsonResponse([]);
      if (href.includes("/rest/v1/creator_outreach_contacts?") && method === "GET") return jsonResponse(contacts);
      if (href.includes("creator_outreach_suppressions?email=eq.suppressed%40example.com")) {
        return jsonResponse([{ email: "suppressed@example.com" }]);
      }
      if (href.includes("/rest/v1/creator_outreach_suppressions?")) return jsonResponse([]);
      if (href === `${SUPABASE_URL}/rest/v1/creator_outreach_delivery_log` && method === "POST") {
        return jsonResponse([{ id: "10000000-0000-4000-8000-000000000001" }], 201);
      }
      if (href.includes("/rest/v1/creator_outreach_delivery_log?id=eq.") && method === "PATCH") return new Response(null, { status: 204 });
      if (href.includes("/rest/v1/creator_outreach_contacts?id=eq.") && method === "PATCH") return new Response(null, { status: 204 });
      throw new Error(`Unexpected request: ${method} ${href}`);
    }));

    const result = await runSendOutreachEmails();

    expect(result).toMatchObject({ sent: 1, attempted: 1, skipped: 2, errors: 0 });
    expect(requests.some((request) => request.method === "PATCH" && request.body?.provider_message_id === "gmail_123")).toBe(true);
    expect(requests.some((request) => request.body?.status === "bounced")).toBe(true);
    expect(requests.some((request) => request.body?.status === "opted_out")).toBe(true);
  });

  it("honors the five-attempt UTC daily limit", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url, options = {}) => {
      const href = String(url);
      const method = options.method || "GET";
      if (href.includes("/rest/v1/creator_outreach_delivery_log?") && method === "GET") {
        return jsonResponse([{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }]);
      }
      throw new Error(`Unexpected request: ${method} ${href}`);
    }));

    await expect(runSendOutreachEmails()).resolves.toMatchObject({ sent: 0, attempted: 0, remaining: 0 });
  });
});
