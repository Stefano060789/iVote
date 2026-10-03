import { supabaseGet, supabaseRequest } from "./cronHelpers.js";

const COUNTRIES = ["Austria", "Italy", "Slovenia", "Malaysia"];
const SEARCH_TYPES = ["boutique hotel", "museum", "cultural venue", "restaurant"];
const TARGET_PER_COUNTRY = 10;

function makeDraft(place, country) {
  const name = place.displayName?.text || "your team";
  const type = String(place.primaryType || "visitor-facing business").replaceAll("_", " ");
  return {
    company_name: name,
    country,
    city: place.formattedAddress?.split(",")[0] || null,
    business_type: type,
    website: place.websiteUri || null,
    contact_email: null,
    source_url: place.googleMapsUri || null,
    personalization_note: `${name} is a ${type} with an in-person visitor experience. Google Places identified it as a potential Godwit feedback pilot prospect.`,
    subject: `A simple Godwit feedback pilot for ${name}`,
    message: `Hello ${name} team,\n\nYour visitor-facing experience may benefit from a simple way to collect useful feedback at the moment it happens. Godwit helps teams use QR-based feedback flows and organize insights for practical follow-up without adding friction for guests or staff.\n\nWe would be happy to offer ${name} a free two-week guided pilot tailored to your visitor experience. Would you be open to a 15-minute online introduction to see whether it could fit your team?\n\nBest,\nStefano`,
    business_review_status: "pending",
    message_review_status: "pending",
    status: "draft"
  };
}

async function searchPlaces(apiKey, query) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.websiteUri,places.googleMapsUri,places.primaryType"
    },
    body: JSON.stringify({ textQuery: query, pageSize: 20 })
  });
  if (!response.ok) throw new Error(`Google Places search failed (${response.status}).`);
  const data = await response.json();
  return data.places || [];
}

export async function runResearchGodwitProspects() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) return { researched: 0, inserted: 0, countries: {}, disabled: true };

  const existing = await supabaseGet(
    "creator_outreach_contacts?select=company_name,country"
  );
  const existingKeys = new Set(existing.map((row) => `${String(row.country).toLowerCase()}|${String(row.company_name).toLowerCase()}`));
  const insertedByCountry = {};
  let researched = 0;
  let inserted = 0;

  for (const country of COUNTRIES) {
    const places = [];
    const seen = new Set();
    for (const searchType of SEARCH_TYPES) {
      if (places.length >= TARGET_PER_COUNTRY) break;
      const results = await searchPlaces(apiKey, `${searchType} in ${country}`);
      for (const place of results) {
        const name = String(place.displayName?.text || "").trim();
        if (!name || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        places.push(place);
        if (places.length >= TARGET_PER_COUNTRY) break;
      }
    }

    const drafts = places
      .slice(0, TARGET_PER_COUNTRY)
      .map((place) => makeDraft(place, country))
      .filter((draft) => !existingKeys.has(`${country.toLowerCase()}|${draft.company_name.toLowerCase()}`));
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
