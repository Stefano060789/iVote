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
          : body.textQuery.startsWith("museum")
            ? placesFor("Museum")
            : placesFor("Real Estate Agency").map((place) => ({
              ...place,
              primaryType: "real_estate_agency"
            }));
        return jsonResponse({ places });
      }
      if (href === `${SUPABASE_URL}/rest/v1/creator_outreach_contacts` && method === "POST") {
        // PostgREST responds 201 Created (not 204) with an empty body for an insert
        // when Prefer: return=minimal is requested.
        return new Response(null, { status: 201 });
      }
      if (href.includes("/rest/v1/creator_outreach_contacts?id=eq.existing-hotel") && method === "PATCH") {
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected request: ${method} ${href}`);
    }));

    const result = await runResearchGodwitProspects({
      countries: ["Italy"],
      businessTypes: ["hotel", "museum", "real-estate-agency"],
      language: "it"
    });

    const googleRequests = requests.filter(({ href }) => href.includes("places.googleapis.com"));
    const insertRequest = requests.find(({ href, method }) =>
      href === `${SUPABASE_URL}/rest/v1/creator_outreach_contacts` && method === "POST"
    );

    expect(result).toMatchObject({ researched: 10, inserted: 10, countries: { Italy: 10 } });
    expect(googleRequests).toHaveLength(3);
    expect(googleRequests.every(({ body }) => body.languageCode === "it")).toBe(true);
    expect(googleRequests.map(({ body }) => body.textQuery)).toContain("agenzia immobiliare in Italy");
    expect(insertRequest.body).toHaveLength(10);
    expect(insertRequest.body.map(({ business_type }) => business_type)).toContain("museum");
    expect(insertRequest.body.map(({ business_type }) => business_type)).toContain("real estate agency");
    expect(insertRequest.body.every(({ city }) => city === "Rome")).toBe(true);
    expect(insertRequest.body.every(({ message }) =>
      message.includes("https://hellogodwit.com") && message.includes("Gentile team")
    )).toBe(true);
    expect(insertRequest.body.find(({ business_type }) => business_type === "real estate agency").message)
      .toContain("annuncio immobiliare");
    expect(insertRequest.body.some(({ company_name }) => company_name === "Hotel 1")).toBe(false);
    expect(requests.some(({ href, method, body }) =>
      href.includes("id=eq.existing-hotel") && method === "PATCH" && body.city === "Rome"
    )).toBe(true);
  });

  it("distributes an explicit total across the selected countries", async () => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.GOOGLE_PLACES_API_KEY = "places-key";
    const requests = [];
    vi.stubGlobal("fetch", vi.fn(async (url, options = {}) => {
      const href = String(url);
      const method = options.method || "GET";
      const body = options.body ? JSON.parse(options.body) : null;
      requests.push({ href, method, body });

      if (href.includes("/rest/v1/creator_outreach_contacts?") && method === "GET") {
        return jsonResponse([]);
      }
      if (href.includes("places.googleapis.com")) {
        const country = body.textQuery.endsWith("Italy") ? "Italy" : "Malaysia";
        return jsonResponse({ places: Array.from({ length: 5 }, (_, index) => ({
          displayName: { text: `${country} Hotel ${index + 1}` },
          formattedAddress: country === "Italy" ? "Rome, Italy" : "Kuala Lumpur, Malaysia",
          addressComponents: [{
            longText: country === "Italy" ? "Rome" : "Kuala Lumpur",
            types: ["locality", "political"]
          }],
          primaryType: "hotel"
        })) });
      }
      if (href === `${SUPABASE_URL}/rest/v1/creator_outreach_contacts` && method === "POST") {
        return new Response(null, { status: 201 });
      }
      throw new Error(`Unexpected request: ${method} ${href}`);
    }));

    const result = await runResearchGodwitProspects({
      countries: ["Italy", "Malaysia"],
      businessTypes: ["hotel"],
      targetTotal: 3,
      language: "en"
    });
    const insertRequests = requests.filter(({ href, method }) =>
      href === `${SUPABASE_URL}/rest/v1/creator_outreach_contacts` && method === "POST"
    );

    expect(result).toMatchObject({
      researched: 3,
      inserted: 3,
      countries: { Italy: 2, Malaysia: 1 }
    });
    const insertedDrafts = insertRequests.flatMap(({ body }) => body);
    expect(insertedDrafts).toHaveLength(3);
    expect(insertedDrafts.map(({ country }) => country)).toEqual(["Italy", "Italy", "Malaysia"]);
  });

  it("rejects an invalid research total before external requests", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "places-key";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(runResearchGodwitProspects({
      countries: ["Italy"],
      businessTypes: ["hotel"],
      targetTotal: 101
    })).rejects.toThrow("between 1 and 100");
    expect(fetchMock).not.toHaveBeenCalled();
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

  it("does not reinsert a sent or discarded location found again under a different business name", async () => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.GOOGLE_PLACES_API_KEY = "places-key";
    const requests = [];
    vi.stubGlobal("fetch", vi.fn(async (url, options = {}) => {
      const href = String(url);
      const method = options.method || "GET";
      const body = options.body ? JSON.parse(options.body) : null;
      requests.push({ href, method, body });

      if (href.includes("/rest/v1/creator_outreach_contacts?") && method === "GET") {
        return jsonResponse([{
          id: "old-location",
          company_name: "Old business listing",
          country: "Malaysia",
          city: "Kuala Lumpur",
          source_url: "https://maps.google.com/?cid=123",
          contact_email: "info@example.my",
          status: "sent",
          business_review_status: "approved"
        }, {
          id: "discarded-location",
          company_name: "Discarded listing",
          country: "Malaysia",
          city: "Kuala Lumpur",
          source_url: "https://maps.google.com/?cid=456",
          contact_email: null,
          status: "draft",
          business_review_status: "rejected"
        }]);
      }
      if (href.includes("places.googleapis.com")) {
        return jsonResponse({ places: [
          {
            displayName: { text: "Renamed Business" },
            googleMapsUri: "https://maps.google.com/?cid=123",
            primaryType: "hotel"
          },
          {
            displayName: { text: "Discarded listing" },
            googleMapsUri: "https://maps.google.com/?cid=456",
            primaryType: "hotel"
          }
        ] });
      }
      throw new Error(`Unexpected request: ${method} ${href}`);
    }));

    const result = await runResearchGodwitProspects({
      countries: ["Malaysia"],
      businessTypes: ["hotel"],
      language: "en"
    });

    expect(result).toMatchObject({ researched: 0, inserted: 0, countries: { Malaysia: 0 } });
    expect(requests.some(({ method, href }) =>
      method === "POST" && href === `${SUPABASE_URL}/rest/v1/creator_outreach_contacts`
    )).toBe(false);
  });

  it("surfaces a clear error instead of crashing when Google Places returns a non-JSON error body", async () => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.GOOGLE_PLACES_API_KEY = "places-key";
    vi.stubGlobal("fetch", vi.fn(async (url, options = {}) => {
      const href = String(url);
      const method = options.method || "GET";
      if (href.includes("/rest/v1/creator_outreach_contacts?") && method === "GET") return jsonResponse([]);
      if (href.includes("places.googleapis.com")) {
        // Quota-exhaustion and similar upstream failures can come back as an empty
        // or plain-text body instead of JSON.
        return new Response("", { status: 429, headers: { "Content-Type": "text/plain" } });
      }
      throw new Error(`Unexpected request: ${method} ${href}`);
    }));

    await expect(runResearchGodwitProspects({
      countries: ["Austria"],
      businessTypes: ["hotel"]
    })).rejects.toThrow("Google Places search failed (429)");
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
        return new Response(null, { status: 201 });
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

  it("uses public search when a new prospect's listed website is unavailable", async () => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.GOOGLE_PLACES_API_KEY = "places-key";
    process.env.SERPAPI_API_KEY = "search-secret";
    vi.mocked(lookup).mockRejectedValue(new Error("ENOTFOUND"));
    const requests = [];
    vi.stubGlobal("fetch", vi.fn(async (url, options = {}) => {
      const href = String(url);
      const method = options.method || "GET";
      const body = options.body ? JSON.parse(options.body) : null;
      requests.push({ href, method, body });

      if (href.includes("/rest/v1/creator_outreach_contacts?") && method === "GET") {
        return jsonResponse([]);
      }
      if (href.includes("places.googleapis.com")) {
        return jsonResponse({ places: [{
          displayName: { text: "Feeka Coffee Roasters" },
          formattedAddress: "Kuala Lumpur, Malaysia",
          addressComponents: [{ longText: "Kuala Lumpur", types: ["locality", "political"] }],
          websiteUri: "https://dead.example",
          primaryType: "cafe"
        }] });
      }
      if (href.startsWith("https://serpapi.com/search.json")) {
        return jsonResponse({ organic_results: [{
          title: "Feeka Coffee Roasters Kuala Lumpur",
          snippet: "Contact us at hello@feekacoffee.com",
          link: "https://feekacoffee.com/contact"
        }] });
      }
      if (href === `${SUPABASE_URL}/rest/v1/creator_outreach_contacts` && method === "POST") {
        return new Response(null, { status: 201 });
      }
      throw new Error(`Unexpected request: ${method} ${href}`);
    }));

    const result = await runResearchGodwitProspects({
      countries: ["Malaysia"],
      businessTypes: ["cafe"],
      language: "en"
    });
    const insertRequest = requests.find(({ href, method }) =>
      href === `${SUPABASE_URL}/rest/v1/creator_outreach_contacts` && method === "POST"
    );

    expect(result).toMatchObject({ researched: 1, inserted: 1, emailsFound: 1 });
    expect(insertRequest.body[0]).toMatchObject({
      contact_email: "hello@feekacoffee.com",
      personalization_note: expect.stringContaining("relevant web search results")
    });
    expect(requests.some(({ href }) => href.startsWith("https://serpapi.com/search.json"))).toBe(true);
  });

  it("rejects a locality component that is actually a street address with a house number", async () => {
    process.env.SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.GOOGLE_PLACES_API_KEY = "places-key";
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
              // Small villages in Austria are sometimes reported by Google Places as the
              // "locality" address component even though the longText is really the
              // street name plus house number (no separate city exists).
              displayName: { text: "Mountain Lodge" },
              formattedAddress: "Oberlech 761, Austria",
              addressComponents: [{ longText: "Oberlech 761", types: ["locality", "political"] }],
              primaryType: "hotel"
            }
          ]
        });
      }
      if (href === `${SUPABASE_URL}/rest/v1/creator_outreach_contacts` && method === "POST") {
        return new Response(null, { status: 201 });
      }
      throw new Error(`Unexpected request: ${method} ${href}`);
    }));

    const result = await runResearchGodwitProspects({
      countries: ["Austria"],
      businessTypes: ["hotel"],
      language: "de"
    });
    const insertRequest = requests.find(({ href, method }) =>
      href === `${SUPABASE_URL}/rest/v1/creator_outreach_contacts` && method === "POST"
    );

    expect(result).toMatchObject({ researched: 1, inserted: 1 });
    expect(result.countries.Austria).toBe(1);
    expect(insertRequest.body[0]).toMatchObject({ city: null });
  });
});
