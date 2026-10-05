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

  it("cycles through distinct fallback options when regenerating repeatedly", async () => {
    delete process.env.OPENAI_API_KEY;
    const business = {
      companyName: "Example Realty",
      businessType: "real_estate_agency",
      country: "Malaysia",
      city: "Kuala Lumpur",
      language: "en"
    };
    const first = await generatePersonalizedOutreach({ ...business, variation: 1 });
    const second = await generatePersonalizedOutreach({
      ...business,
      variation: 2,
      previousMessage: first.message
    });

    expect(second.message).not.toBe(first.message);
    expect(second.message).not.toContain("That can help your team spot recurring feedback");
    expect(second.message).toContain("Example Realty");
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
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages[0].content)
      .toContain("category-specific scenario");
    expect(result).toEqual(generatedCopy);
  });

  it("falls back to a different option if AI repeats the previous message", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    const previousMessage = [
      "Dear Example Hotel team,",
      "A stay has several important touchpoints from arrival to checkout. Godwit lets you place a QR code and ask a short poll.",
      "We would be glad to offer your team a complimentary guided two-week pilot.",
      "https://hellogodwit.com",
      "Kind regards, Stefano and Mariia"
    ].join("\n");
    vi.mocked(getPublicBusinessWebsiteContext).mockResolvedValue({
      text: "",
      status: "not_found",
      sourceUrl: "https://example.org"
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            subject: "A guest feedback idea for Example Hotel",
            message: previousMessage,
            personalizationReason: "The business category suggests a guest feedback use case."
          })
        }
      }]
    }), { status: 200 })));

    const result = await generatePersonalizedOutreach({
      companyName: "Example Hotel",
      businessType: "hotel",
      country: "Malaysia",
      city: "Kuala Lumpur",
      website: "https://example.org",
      language: "en",
      previousMessage,
      variation: 2
    });

    expect(result.message).not.toBe(previousMessage);
    expect(result.message).toContain("Example Hotel");
  });
});
