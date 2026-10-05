import { describe, expect, it } from "vitest";
import { createOutreachCopy, getOutreachLanguageLabel, resolveOutreachLanguage } from "./outreachCopy.js";

describe("localized outreach copy", () => {
  it.each([
    ["Austria", "de", "Guten Tag"],
    ["Italy", "it", "Gentile team"],
    ["Malaysia", "en", "Dear"]
  ])("chooses %s local-language copy automatically", (country, language, greeting) => {
    expect(resolveOutreachLanguage("auto", country)).toBe(language);
    expect(createOutreachCopy({ companyName: "Example", country }).message).toContain(greeting);
  });

  it.each(["en", "de", "it", "ms"])("includes the Godwit website in %s copy", (language) => {
    const draft = createOutreachCopy({
      companyName: "Example Gallery",
      businessType: "art gallery",
      country: "Malaysia",
      language
    });

    expect(draft.subject).toContain("Example Gallery");
    expect(draft.message).toContain("https://hellogodwit.com");
    expect(draft.message).toContain("Stefano and Mariia");
    expect(getOutreachLanguageLabel(draft.language)).toBeTruthy();
  });

  it("uses English for unsupported country names in automatic mode", () => {
    expect(resolveOutreachLanguage("auto", "Unknown")).toBe("en");
  });

  it("creates a concise, specific subject without appended location descriptors", () => {
    const draft = createOutreachCopy({
      companyName: "The Luna Grand Ballroom - Kuala Lumpur Lifestyle Event Venue",
      businessType: "event venue",
      country: "Malaysia",
      language: "en"
    });

    expect(draft.subject).toBe("A visitor feedback idea for The Luna Grand Ballroom");
    expect(draft.subject.length).toBeLessThanOrEqual(120);
  });

  it("writes a grounded, property-viewing-specific introduction for real estate agencies", () => {
    const draft = createOutreachCopy({
      companyName: "Example Immobilien",
      businessType: "real_estate_agency",
      country: "Austria",
      city: "Vienna",
      language: "auto"
    });

    expect(draft.subject).toContain("Besichtigungen");
    expect(draft.message).toContain("Example Immobilien");
    expect(draft.message).toContain("in Vienna");
    expect(draft.message).toContain("Kauf- oder Mietinteressenten");
    expect(draft.message).toContain("Rückmeldungen direkt nach einer Immobilienbesichtigung");
    expect(draft.personalizationReason).toContain("Immobilienbesichtigung");
    expect(draft.businessProfile).toBe("real-estate");
  });

  it("frames a real estate viewing use case in English without inventing company facts", () => {
    const draft = createOutreachCopy({
      companyName: "Example Realty",
      businessType: "real estate agency",
      country: "Malaysia",
      city: "Kuala Lumpur",
      language: "en"
    });

    expect(draft.message).toContain("listed as a real estate agency in Kuala Lumpur");
    expect(draft.message).toContain("what prospective buyers or renters liked");
    expect(draft.message).not.toContain("we saw your");
  });
});
