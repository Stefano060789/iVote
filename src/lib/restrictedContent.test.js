import { describe, it, expect } from "vitest";
import { isRestrictedTopic } from "./restrictedContent";

describe("isRestrictedTopic", () => {
  it("regression: does not flag the word 'vote' itself", () => {
    // This was a real bug: the product (formerly "iVote", now "Godwit") is fundamentally about voting,
    // so "vote" must never be treated as restricted political content.
    expect(isRestrictedTopic("I vote for the pasta special")).toBe(false);
    expect(isRestrictedTopic("Great voting experience")).toBe(false);
  });

  it("does not flag common hospitality words like 'party'", () => {
    expect(isRestrictedTopic("Our party of four loved the tasting menu")).toBe(false);
    expect(isRestrictedTopic("Best birthday party ever")).toBe(false);
  });

  it("flags clearly political content", () => {
    expect(isRestrictedTopic("Let's talk about the election")).toBe(true);
    expect(isRestrictedTopic("The government should do more")).toBe(true);
    expect(isRestrictedTopic("I love this president")).toBe(true);
  });

  it("flags clearly religious content", () => {
    expect(isRestrictedTopic("We prayed at church this morning")).toBe(true);
    expect(isRestrictedTopic("God bless this place")).toBe(true);
  });

  it("flags clearly sexual content", () => {
    expect(isRestrictedTopic("that was porn")).toBe(true);
  });

  it("does not flag ordinary positive feedback", () => {
    expect(isRestrictedTopic("The food was excellent and the staff were kind")).toBe(false);
    expect(isRestrictedTopic("Loved the exhibit, will come back soon")).toBe(false);
  });

  it("matches whole words only, not substrings inside unrelated words", () => {
    // "sex" should not match inside an unrelated word such as "Sussex" or "essex".
    expect(isRestrictedTopic("We visited Essex last weekend")).toBe(false);
  });

  it("is resistant to simple accent-based obfuscation", () => {
    expect(isRestrictedTopic("élection day was busy")).toBe(true);
  });
});
