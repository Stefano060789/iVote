const politicalTerms = [
  "politic", "election", "president", "government", "referendum"
];

const religiousTerms = [
  "religion", "god", "allah", "church", "mosque", "bible", "quran"
];

const sexualTerms = [
  "sex", "sexual", "porn", "nude", "fetish"
];

const ALL_TERMS = [...politicalTerms, ...religiousTerms, ...sexualTerms];

function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // strip accents so "élection" still matches "election"
}

export function isRestrictedTopic(text) {
  const normalized = normalize(text);

  return ALL_TERMS.some((term) => new RegExp(`\\b${term}`, "i").test(normalized));
}
