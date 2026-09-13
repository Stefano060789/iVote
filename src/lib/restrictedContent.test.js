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

  it("flags political/religious/sexual content in other supported languages", () => {
    expect(isRestrictedTopic("Vogliamo parlare delle elezioni")).toBe(true); // Italian: elections
    expect(isRestrictedTopic("Fuimos a la iglesia el domingo")).toBe(true); // Spanish: church
    expect(isRestrictedTopic("C'était du contenu porno")).toBe(true); // French: porn
    expect(isRestrictedTopic("Die Regierung sollte handeln")).toBe(true); // German: government
    expect(isRestrictedTopic("Fomos à igreja ontem")).toBe(true); // Portuguese: church
    expect(isRestrictedTopic("We gingen naar de kerk")).toBe(true); // Dutch: church
    expect(isRestrictedTopic("Poszliśmy do kościoła")).toBe(true); // Polish: church
    expect(isRestrictedTopic("ذهبنا إلى المسجد")).toBe(true); // Arabic: mosque
    expect(isRestrictedTopic("我们讨论了政治问题")).toBe(true); // Chinese: politics
  });

  it("does not flag an unrelated Polish word that happens to start like a blocked stem", () => {
    // Regression guard for the near-miss found while building the Polish term list: a naive
    // "nag" stem for "nagi/naga" (nude) would also match "nagroda" (prize/award), a word this
    // app's own poll/reward copy uses constantly - so a longer, safer stem was used instead.
    expect(isRestrictedTopic("Zdobyłeś nagrodę!")).toBe(false);
  });

  it("does not flag common words that merely start with a Chinese political/religious term", () => {
    expect(isRestrictedTopic("这家餐厅的服务很好")).toBe(false);
  });
});
