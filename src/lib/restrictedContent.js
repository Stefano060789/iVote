// Keyword-based restricted-topic filter, used as a fast, zero-latency, zero-cost first line
// of defense (checked synchronously before a poll/answer is even submitted). It intentionally
// covers all ten languages this app ships UI translations for, not just English - a keyword
// list that only understood English was trivially bypassed by writing in any other language.
//
// This is a best-effort baseline, not a complete solution: keyword lists always trade off
// false positives (e.g. "government" also blocks an innocent question that happens to mention
// it) against false negatives (paraphrases, obfuscation, languages/scripts not listed here).
// For the highest-risk surface - anonymous voters submitting free-text answers on a public QR
// page - `api/classify-sentiment.js` also runs a real multi-language AI classification pass
// after submission and auto-hides anything it flags, which catches what this list misses.
//
// Terms are matched as *prefixes* (e.g. "elect" matches "election", "elections", "electoral"),
// mirroring how the original English-only list worked, so a single stem covers a language's
// common inflections without listing every form.

const politicalTerms = [
  // English
  "politic", "election", "president", "government", "referendum",
  // Italian
  "elezion", "govern",
  // Spanish
  "elecc", "gobiern",
  // French
  "politiqu", "gouvernement",
  // German
  "politik", "wahl", "prasident", "regierung",
  // Portuguese
  "eleic", "referendo",
  // Dutch
  "politiek", "verkiezing",
  // Polish
  "polityk", "wybor", "prezydent", "rzad",
  // Arabic (word-initial match; definite-article-attached forms like "ال..." can slip past this)
  "سياس", "انتخاب", "رئيس", "حكوم", "استفتاء",
  // Chinese (matched as plain substrings, see isCjkTerm below - no word boundaries in CJK text)
  "政治", "选举", "总统", "政府", "公投"
];

const religiousTerms = [
  // English
  "religion", "god", "allah", "church", "mosque", "bible", "quran",
  // Italian
  "dio", "chiesa", "moschea", "bibbia", "corano",
  // Spanish
  "dios", "iglesia", "mezquita", "biblia",
  // French
  "dieu", "eglise", "mosquee", "coran",
  // German
  "gott", "kirche", "moschee", "bibel", "koran",
  // Portuguese
  "religiao", "deus", "igreja", "mesquita", "alcorao",
  // Dutch
  "religie", "kerk", "moskee", "bijbel",
  // Polish
  "religi", "bog", "koscio", "meczet",
  // Arabic
  "دين", "الله", "كنيس", "مسجد", "انجيل", "قرآن",
  // Chinese
  "宗教", "上帝", "教堂", "清真寺", "圣经", "古兰经"
];

const sexualTerms = [
  // English
  "sex", "sexual", "porn", "nude", "fetish",
  // Italian
  "sess", "porno", "nud", "feticis",
  // Spanish
  "desnud", "fetich",
  // French
  "nudite", "fetichisme",
  // German
  "nackt", "fetisch",
  // Portuguese
  "nudez",
  // Dutch
  "seks", "naakt", "fetisj",
  // Polish
  "nagosc", "fetysz",
  // Arabic
  "جنس", "إباحي", "عاري", "فيتيش",
  // Chinese
  "性交", "色情", "裸体", "恋物癖"
];

const ALL_TERMS = [...politicalTerms, ...religiousTerms, ...sexualTerms];

// Chinese terms are matched as plain substrings rather than at a "word start", since CJK text
// isn't space-delimited the way Latin/Cyrillic/Arabic scripts are - there's no equivalent of a
// word boundary to anchor on.
const CJK_PATTERN = /[\u4e00-\u9fff\u3400-\u4dbf]/;

// Arabic attaches its definite article ("ال", roughly "the") directly onto the following word
// with no space - "مسجد" (mosque) very commonly appears as "المسجد" (the mosque) in real
// sentences. Allow that one specific, extremely common prefix to sit between the word-boundary
// and the term itself, without trying to handle Arabic morphology more generally.
const ARABIC_PATTERN = /[\u0600-\u06ff]/;
const ARABIC_ARTICLE = "\u0627\u0644"; // "ال"

function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // strip accents so "élection" still matches "election"
}

function escapeForRegex(term) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesTerm(normalizedText, term) {
  if (CJK_PATTERN.test(term)) {
    return normalizedText.includes(term);
  }

  // A Unicode-aware "word start" check: the term must be preceded by the start of the string
  // or a non-letter/non-digit character (with an optional attached Arabic definite article in
  // between, see ARABIC_ARTICLE above). Plain `\b` only understands ASCII word characters
  // ([A-Za-z0-9_]), so it silently never matches inside Arabic, Chinese, or other non-Latin
  // scripts - there's never an ASCII-word/non-word transition anywhere in such text - which
  // would otherwise make every non-Latin term in this file completely inert.
  const articlePrefix = ARABIC_PATTERN.test(term) ? `(?:${ARABIC_ARTICLE})?` : "";
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${articlePrefix}${escapeForRegex(term)}`, "u").test(normalizedText);
}

export function isRestrictedTopic(text) {
  const normalized = normalize(text);
  return ALL_TERMS.some((term) => matchesTerm(normalized, term));
}
