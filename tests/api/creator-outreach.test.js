import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../api/creator-outreach.js";

const originalEnv = { ...process.env };

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function makeResponse() {
  const res = {
    statusCode: 200,
    body: undefined,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

function makeRequest({ body, token = "user-token" } = {}) {
  return {
    method: "POST",
    headers: { authorization: ["Bearer", token].join(" ") },
    body
  };
}

describe("creator-outreach regenerate action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it("addresses the draft to the actual company name, not a snake_case mismatch default", async () => {
    process.env.SUPABASE_URL = "https://supabase.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    process.env.CREATOR_EMAILS = "bonomistefano@outlook.it";

    vi.stubGlobal("fetch", vi.fn(async (url, options = {}) => {
      const href = String(url);
      const method = options.method || "GET";
      if (href.includes("/auth/v1/user")) {
        return jsonResponse({ email: "bonomistefano@outlook.it" });
      }
      if (href.includes("/rest/v1/creator_outreach_contacts?id=eq.contact-1") && method === "GET") {
        return jsonResponse([{
          id: "contact-1",
          company_name: "House of Ble",
          business_type: "hotel",
          country: "Austria"
        }]);
      }
      if (href.includes("/rest/v1/creator_outreach_contacts?id=eq.contact-1") && method === "PATCH") {
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected request: ${method} ${href}`);
    }));

    const req = makeRequest({ body: { action: "regenerate", contactId: "contact-1", language: "de" } });
    const res = makeResponse();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.subject).toContain("House of Ble");
    expect(res.body.message).toContain("House of Ble");
    expect(res.body.subject).not.toContain("your team");
  });
});
