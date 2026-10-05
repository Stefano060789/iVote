import { afterEach, describe, expect, it, vi } from "vitest";
import { createOutreachCopy } from "./outreachCopy.js";
import { generatePersonalizedOutreach } from "./personalizedOutreach.js";
import { getPublicBusinessWebsiteContext } from "./publicBusinessEmail.js";

vi.mock("./publicBusinessEmail.js", () => ({
  getPublicBusinessWebsiteContext: vi.fn()
}));

const originalEnv = { ...process.env };

describe("generatePersonalizedOutreach", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(getPublicBusinessWebsiteContext).mockReset();
    process.env = { ...originalEnv };
  });

  it("creates a fresh category-specific fallback when AI is not configured", async () => {
    delete process.env.OPENAI_API_KEY;
    const previous = createOutreachCopy({
      companyName: "Example Realty",
      businessType: "real_estate_agency",
      country: "Malaysia",
      city: "Kuala Lumpur",
      language: "en",
      variation: 0
    });

    const generated = await generatePersonalizedOutreach({
      companyName: "Example Realty",
      businessType: "real_estate_agency",
      country: "Malaysia",
      city: "Kuala Lumpur",
      website: "https://example.org",
      language: "en",
      previousMessage: previous.message
    });

    expect(generated.message).not.toBe(previous.message);
    expect(generated.message).toContain("Example Realty");
    expect(generated.message).toContain("property poster");
  });

  it("uses official-site context to generate a different AI draft", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    vi.mocked(getPublicBusinessWebsiteContext).mockResolvedValue({
      text: "Family-run hotel near the old town with guided garden tours.",
      status: "found",
      sourceUrl: "https://example.org"
    });
    const previousMessage = "The previous draft";
    const generatedCopy = {
      subject: "A guest feedback idea for Example Hotel",
      message: "Dear Example Hotel team, your garden tours sound distinctive. Godwit could gather guest feedback with a QR poll. https://hellogodwit.com\n\nStefano and Mariia",
      personalizationReason: "The website mentions guided garden tours."
    };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(generatedCopy) } }]
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generatePersonalizedOutreach({
      companyName: "Example Hotel",
      businessType: "hotel",
      country: "Austria",
      city: "Vienna",
      website: "https://example.org",
      language: "de",
      previousMessage
    });

    expect(getPublicBusinessWebsiteContext).toHaveBeenCalledWith("https://example.org");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages[1].content)
      .toContain("guided garden tours");
    expect(result).toEqual(generatedCopy);
  });
});
