import { afterEach, describe, expect, it, vi } from "vitest";
import { lookup } from "node:dns/promises";
import { runResearchGodwitProspects } from "./researchGodwitProspectsJob.js";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn()
}));

const SUPABASE_URL = "https://supabase.test";
const originalEnv = { ...process.env };

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("runResearchGodwitProspects", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it("uses selected filters, spreads results across types, and persists localized drafts", async () => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.GOOGLE_PLACES_API_KEY = "places-key";
    const requests = [];
    const placesFor = (prefix) => Array.from({ length: 6 }, (_, index) => ({
      displayName: { text: `${prefix} ${index + 1}` },
      formattedAddress: `${index + 1} Main Street, Italy`,
      addressComponents: [{ longText: "Rome", types: ["locality", "political"] }],
      primaryType: prefix.toLowerCase()
    }));

    vi.stubGlobal("fetch", vi.fn(async (url, options = {}) => {
      const href = String(url);
      const method = options.method || "GET";
      const body = options.body ? JSON.parse(options.body) : null;
      requests.push({ href, method, body });

      if (href.includes("/rest/v1/creator_outreach_contacts?") && method === "GET") {
        return jsonResponse([{ id: "existing-hotel", company_name: "Hotel 1", country: "Italy", city: "Old street value" }]);
      }
      if (href.includes("places.googleapis.com")) {
        const places = body.textQuery.startsWith("hotel")
          ? placesFor("Hotel")
          : placesFor("Museum");
        return jsonResponse({ places });
      }
      if (href === `${SUPABASE_URL}/rest/v1/creator_outreach_contacts` && method === "POST") {
        return new Response(null, { status: 204 });
      }
      if (href.includes("/rest/v1/creator_outreach_contacts?id=eq.existing-hotel") && method === "PATCH") {
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected request: ${method} ${href}`);
    }));

    const result = await runResearchGodwitProspects({
      countries: ["Italy"],
      businessTypes: ["hotel", "museum"],
      language: "it"
    });

    const googleRequests = requests.filter(({ href }) => href.includes("places.googleapis.com"));
    const insertRequest = requests.find(({ href, method }) =>
      href === `${SUPABASE_URL}/rest/v1/creator_outreach_contacts` && method === "POST"
    );

    expect(result).toMatchObject({ researched: 10, inserted: 10, countries: { Italy: 10 } });
    expect(googleRequests).toHaveLength(2);
    expect(googleRequests.every(({ body }) => body.languageCode === "it")).toBe(true);
    expect(insertRequest.body).toHaveLength(10);
    expect(insertRequest.body.map(({ business_type }) => business_type)).toContain("museum");
    expect(insertRequest.body.every(({ city }) => city === "Rome")).toBe(true);
    expect(insertRequest.body.every(({ message }) =>
      message.includes("https://hellogodwit.com") && message.includes("Gentile team")
    )).toBe(true);
    expect(insertRequest.body.some(({ company_name }) => company_name === "Hotel 1")).toBe(false);
    expect(requests.some(({ href, method, body }) =>
      href.includes("id=eq.existing-hotel") && method === "PATCH" && body.city === "Rome"
    )).toBe(true);
  });

  it("rejects unsupported filters before making external requests", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "places-key";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(runResearchGodwitProspects({
      countries: ["France"],
      businessTypes: ["hotel"]
    })).rejects.toThrow("not supported");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unsupported language before querying Supabase or Places", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "places-key";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(runResearchGodwitProspects({ language: "fr" }))
      .rejects.toThrow("language is not supported");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stores a publicly listed email from the business website", async () => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.GOOGLE_PLACES_API_KEY = "places-key";
    vi.mocked(lookup).mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const requests = [];
    vi.stubGlobal("fetch", vi.fn(async (url, options = {}) => {
      const href = String(url);
      const method = options.method || "GET";
      const body = options.body ? JSON.parse(options.body) : null;
      requests.push({ href, method, body });

      if (href.includes("/rest/v1/creator_outreach_contacts?") && method === "GET") return jsonResponse([]);
      if (href.includes("places.googleapis.com")) {
        return jsonResponse({
          places: [
            {
              displayName: { text: "Example Hotel" },
              formattedAddress: "Via Roma 10, Rome, Italy",
              websiteUri: "https://example.org",
              primaryType: "hotel"
            },
            {
              displayName: { text: "Roadside Hotel" },
              formattedAddress: "Reith 23, Italy",
              primaryType: "hotel"
            }
          ]
        });
      }
      if (href === "https://example.org/") {
        return new Response('<a href="mailto:info@example.org">Contact us</a>', {
          headers: { "Content-Type": "text/html" }
        });
      }
      if (href === `${SUPABASE_URL}/rest/v1/creator_outreach_contacts` && method === "POST") {
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected request: ${method} ${href}`);
    }));

    const result = await runResearchGodwitProspects({
      countries: ["Italy"],
      businessTypes: ["hotel"],
      language: "en"
    });
    const insertRequest = requests.find(({ href, method }) =>
      href === `${SUPABASE_URL}/rest/v1/creator_outreach_contacts` && method === "POST"
    );

    expect(result).toMatchObject({ researched: 2, inserted: 2, emailsFound: 1 });
    expect(insertRequest.body[0]).toMatchObject({
      contact_email: "info@example.org",
      website: "https://example.org",
      city: "Rome",
      personalization_note: expect.stringContaining("info@example.org")
    });
    expect(insertRequest.body[1]).toMatchObject({ contact_email: null, city: null });
  });
});
