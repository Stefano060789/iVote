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
});
