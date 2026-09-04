const politicalTerms = [
  "politic", "election", "president", "government", "party", "vote"
];

const religiousTerms = [
  "religion", "god", "allah", "church", "mosque", "bible", "quran"
];

const sexualTerms = [
  "sex", "sexual", "porn", "nude", "fetish"
];

export function isRestrictedTopic(text) {
  const lower = String(text).toLowerCase();

  return (
    politicalTerms.some((t) => lower.includes(t)) ||
    religiousTerms.some((t) => lower.includes(t)) ||
    sexualTerms.some((t) => lower.includes(t))
  );
}
