import { supabaseGet, supabaseRequest } from "./cronHelpers.js";
import { createOutreachCopy } from "./outreachCopy.js";
import { RESEARCH_BUSINESS_TYPES, RESEARCH_COUNTRIES } from "./researchOptions.js";

export { RESEARCH_BUSINESS_TYPES, RESEARCH_COUNTRIES } from "./researchOptions.js";
export const TARGET_PER_COUNTRY = 10;

const COUNTRY_CODES = { Austria: "AT", Italy: "IT", Malaysia: "MY" };
const LANGUAGE_CODES = { en: "en", de: "de", it: "it", ms: "ms" };
const COUNTRY_LANGUAGES = { Austria: "de", Italy: "it", Malaysia: "en" };

function makeDraft(place, country, language) {
  const name = place.displayName?.text || "your team";
  const type = String(place.primaryType || "visitor-facing business").replaceAll("_", " ");
  const copy = createOutreachCopy({ companyName: name, businessType: type, country, language });
  return {
    company_name: name,
    country,
    city: place.formattedAddress?.split(",")[0] || null,
    business_type: type,
    website: place.websiteUri || null,
    contact_email: null,
    source_url: place.googleMapsUri || null,
    personalization_note: `${name} is a ${type} with an in-person visitor experience. Google Places identified it as a potential Godwit feedback pilot prospect.`,
    subject: copy.subject,
    message: copy.message,
    business_review_status: "pending",
    message_review_status: "pending",
    status: "draft"
  };
}

async function searchPlaces(apiKey, query, country, language) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.websiteUri,places.googleMapsUri,places.primaryType"
    },
    body: JSON.stringify({
      textQuery: query,
      pageSize: 20,
      regionCode: COUNTRY_CODES[country],
      languageCode: LANGUAGE_CODES[language] || "en"
    })
  });
  const data = await response.json();
  if (!response.ok) {
    const detail = data.error?.message || data.error?.status;
    throw new Error(`Google Places search failed (${response.status})${detail ? `: ${detail}` : "."}`);
  }
  return data.places || [];
}

function normalizeSelection(values, allowedValues, fallbackValues, description) {
  if (values === undefined) return fallbackValues;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`Select at least one ${description}.`);
  }
  const selected = [...new Set(values.map(String))];
  if (selected.some((value) => !allowedValues.includes(value))) {
    throw new Error(`One or more selected ${description} are not supported.`);
  }
  return selected;
}

export async function runResearchGodwitProspects({
  countries,
  businessTypes,
  language = "auto"
} = {}) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) return { researched: 0, inserted: 0, countries: {}, disabled: true };

  const selectedCountries = normalizeSelection(countries, RESEARCH_COUNTRIES, RESEARCH_COUNTRIES, "countries");
  const selectedBusinessTypes = normalizeSelection(
    businessTypes,
    RESEARCH_BUSINESS_TYPES.map(({ id }) => id),
    RESEARCH_BUSINESS_TYPES.map(({ id }) => id),
    "business types"
  );
  if (language !== "auto" && !LANGUAGE_CODES[language]) {
    throw new Error("Selected outreach language is not supported.");
  }
  const existing = await supabaseGet("creator_outreach_contacts?select=company_name,country");
  const existingKeys = new Set(
    existing.map((row) => `${String(row.country).toLowerCase()}|${String(row.company_name).toLowerCase()}`)
  );
  const insertedByCountry = {};
  let researched = 0;
  let inserted = 0;

  for (const country of selectedCountries) {
    const selectedLanguage = language === "auto" ? COUNTRY_LANGUAGES[country] : language;
    const resultsByType = [];

    for (const businessType of RESEARCH_BUSINESS_TYPES) {
      if (!selectedBusinessTypes.includes(businessType.id)) continue;
      resultsByType.push(await searchPlaces(
        apiKey,
        `${businessType.query} in ${country}`,
        country,
        selectedLanguage
      ));
    }

    const places = [];
    const seen = new Set();
    const countryPrefix = `${country.toLowerCase()}|`;
    for (let index = 0; places.length < TARGET_PER_COUNTRY; index += 1) {
      let foundAtIndex = false;
      for (const results of resultsByType) {
        const place = results[index];
        if (!place) continue;
        foundAtIndex = true;
        const name = String(place.displayName?.text || "").trim();
        const key = name.toLowerCase();
        if (!name || seen.has(key) || existingKeys.has(`${countryPrefix}${key}`)) continue;
        seen.add(key);
        places.push(place);
        if (places.length >= TARGET_PER_COUNTRY) break;
      }
      if (!foundAtIndex) break;
    }

    const drafts = places.map((place) => makeDraft(place, country, language));
    researched += places.length;
    if (drafts.length > 0) {
      await supabaseRequest("creator_outreach_contacts", {
        method: "POST",
        prefer: "return=minimal",
        body: drafts
      });
    }
    insertedByCountry[country] = drafts.length;
    inserted += drafts.length;
  }
  return { researched, inserted, countries: insertedByCountry };
}
