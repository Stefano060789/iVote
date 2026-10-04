import { supabaseGet, supabaseRequest } from "./cronHelpers.js";
import { createOutreachCopy } from "./outreachCopy.js";
import { findPublicBusinessEmail } from "./publicBusinessEmail.js";
import { RESEARCH_BUSINESS_TYPES, RESEARCH_COUNTRIES } from "./researchOptions.js";

export { RESEARCH_BUSINESS_TYPES, RESEARCH_COUNTRIES } from "./researchOptions.js";
export const TARGET_PER_COUNTRY = 10;

const COUNTRY_CODES = { Austria: "AT", Italy: "IT", Malaysia: "MY" };
const LANGUAGE_CODES = { en: "en", de: "de", it: "it", ms: "ms" };
const COUNTRY_LANGUAGES = { Austria: "de", Italy: "it", Malaysia: "en" };

function isValidCityName(candidate, country) {
  if (!candidate) return false;
  const normalized = candidate.trim();
  if (!normalized) return false;
  if (
    normalized.toLowerCase() === country.toLowerCase() ||
    // Reject anything containing digits: real city names don't have house numbers,
    // but small-village addresses (e.g. "Oberlech 761") can be misreported as the locality.
    /\d/.test(normalized) ||
    /\b(?:AT|IT|MY)$/i.test(normalized) ||
    /\b(street|strasse|straße|road|via|rue|strada|avenue|lane|drive|platz|gasse|weg|markt)\b/i.test(normalized)
  ) {
    return false;
  }
  return true;
}

function getPlaceCity(place, country) {
  const components = place.addressComponents || [];
  const preferredTypes = ["locality", "postal_town"];
  for (const type of preferredTypes) {
    const component = components.find((item) => item.types?.includes(type));
    if (isValidCityName(component?.longText, country)) return component.longText.trim();
  }

  const addressParts = String(place.formattedAddress || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (addressParts.length < 2) return null;
  const lastPart = addressParts.at(-1)?.toLowerCase();
  const cityPart = lastPart === country.toLowerCase()
    ? addressParts.at(-2)
    : addressParts.at(-1);
  const normalizedCity = cityPart?.replace(/^\d{4,6}\s*/, "");
  return isValidCityName(normalizedCity, country) ? normalizedCity : null;
}

function normalizePlaceUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = "";
    return url.href.toLowerCase();
  } catch {
    return String(value).trim().toLowerCase();
  }
}

function makeDraft(place, country, language, contactEmail) {
  const name = place.displayName?.text || "your team";
  const type = String(place.primaryType || "visitor-facing business").replaceAll("_", " ");
  const copy = createOutreachCopy({ companyName: name, businessType: type, country, language });
  const emailNote = contactEmail
    ? ` A public contact email was found on the official website: ${contactEmail}.`
    : " No public contact email was found on the official website; verify before sending.";
  return {
    company_name: name,
    country,
    city: getPlaceCity(place, country),
    business_type: type,
    website: place.websiteUri || null,
    contact_email: contactEmail,
    source_url: place.googleMapsUri || null,
    personalization_note: `${name} is a ${type} with an in-person visitor experience. Google Places identified it as a potential Godwit feedback pilot prospect.${emailNote}`,
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
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.addressComponents,places.websiteUri,places.googleMapsUri,places.primaryType"
    },
    body: JSON.stringify({
      textQuery: query,
      pageSize: 20,
      regionCode: COUNTRY_CODES[country],
      languageCode: LANGUAGE_CODES[language] || "en"
    })
  });
  // Read the body as text first: Google can return a non-JSON (or empty) body on
  // errors such as quota exhaustion or an invalid key, and calling response.json()
  // directly would throw an opaque "Unexpected end of JSON input" in that case.
  const rawBody = await response.text();
  let data;
  try {
    data = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    data = {};
  }
  if (!response.ok) {
    const detail = data.error?.message || data.error?.status || rawBody.slice(0, 200) || "no response body";
    throw new Error(`Google Places search failed (${response.status}): ${detail}`);
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
  const existing = await supabaseGet("creator_outreach_contacts?select=id,company_name,country,city,contact_email,personalization_note,source_url");
  const existingByKey = new Map(
    existing.map((row) => [
      `${String(row.country).toLowerCase()}|${String(row.company_name).toLowerCase()}`,
      row
    ])
  );
  const existingBySourceUrl = new Map(
    existing
      .filter((row) => normalizePlaceUrl(row.source_url))
      .map((row) => [normalizePlaceUrl(row.source_url), row])
  );
  const insertedByCountry = {};
  let researched = 0;
  let inserted = 0;
  let emailsFound = 0;

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
    const seenSourceUrls = new Set();
    const refreshedExisting = new Set();
    let existingEmailLookups = 0;
    const countryPrefix = `${country.toLowerCase()}|`;
    for (let index = 0; places.length < TARGET_PER_COUNTRY; index += 1) {
      let foundAtIndex = false;
      for (const results of resultsByType) {
        const place = results[index];
        if (!place) continue;
        foundAtIndex = true;
        const name = String(place.displayName?.text || "").trim();
        const key = name.toLowerCase();
        const sourceUrl = normalizePlaceUrl(place.googleMapsUri);
        const existingContact = existingByKey.get(`${countryPrefix}${key}`)
          || (sourceUrl ? existingBySourceUrl.get(sourceUrl) : undefined);
        if (existingContact && !refreshedExisting.has(key)) {
          refreshedExisting.add(key);
          const updates = {};
          const city = getPlaceCity(place, country);
          if (city && city !== existingContact.city) {
            updates.city = city;
          } else if (!isValidCityName(existingContact.city, country)) {
            // Clear previously stored invalid values (e.g. a street address mistakenly
            // saved as the city) when a fresh lookup doesn't offer a valid replacement.
            updates.city = null;
          }
          if (!existingContact.contact_email && place.websiteUri && existingEmailLookups < TARGET_PER_COUNTRY) {
            existingEmailLookups += 1;
            const emailResult = await findPublicBusinessEmail(place.websiteUri);
            if (emailResult.email) {
              updates.contact_email = emailResult.email;
              updates.personalization_note = `${existingContact.personalization_note || ""} Public contact email found on the official website: ${emailResult.email}.`.trim();
              emailsFound += 1;
              existingContact.contact_email = emailResult.email;
            }
          }
          if (Object.keys(updates).length > 0) {
            await supabaseRequest(`creator_outreach_contacts?id=eq.${encodeURIComponent(existingContact.id)}`, {
              method: "PATCH",
              prefer: "return=minimal",
              body: updates
            });
            if (city) existingContact.city = city;
          }
        }
        if (
          !name ||
          seen.has(key) ||
          (sourceUrl && seenSourceUrls.has(sourceUrl)) ||
          existingByKey.has(`${countryPrefix}${key}`) ||
          (sourceUrl && existingBySourceUrl.has(sourceUrl))
        ) continue;
        seen.add(key);
        if (sourceUrl) seenSourceUrls.add(sourceUrl);
        places.push(place);
        if (places.length >= TARGET_PER_COUNTRY) break;
      }
      if (!foundAtIndex) break;
    }

    const drafts = await mapWithConcurrency(places, 10, async (place) => {
      const emailResult = await findPublicBusinessEmail(place.websiteUri);
      return makeDraft(place, country, language, emailResult.email);
    });
    researched += places.length;
    emailsFound += drafts.filter((draft) => draft.contact_email).length;
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
  return { researched, inserted, emailsFound, countries: insertedByCountry };
}

async function mapWithConcurrency(values, concurrency, callback) {
  const results = new Array(values.length);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, values.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await callback(values[index], index);
    }
  }));
  return results;
}
