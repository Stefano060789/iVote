export const RESEARCH_COUNTRIES = ["Austria", "Italy", "Malaysia"];

export const RESEARCH_BUSINESS_TYPES = [
  { id: "hotel", label: "Hotel", query: "hotel" },
  { id: "bed-and-breakfast", label: "Bed and breakfast", query: "bed and breakfast" },
  { id: "cafe", label: "Cafe", query: "cafe" },
  { id: "restaurant", label: "Restaurant", query: "restaurant" },
  { id: "art-gallery", label: "Art gallery", query: "art gallery" },
  { id: "museum", label: "Museum", query: "museum" },
  { id: "artist-studio", label: "Artist / studio", query: "artist studio" },
  { id: "cultural-venue", label: "Cultural venue", query: "cultural venue" },
  { id: "event-venue", label: "Event venue", query: "event venue" },
  {
    id: "real-estate-agency",
    label: "Real estate agency",
    query: "real estate agency",
    countryQueries: {
      Austria: "Immobilienmakler",
      Italy: "agenzia immobiliare"
    }
  },
  { id: "tour-operator", label: "Tour operator", query: "tour operator" },
  { id: "visitor-attraction", label: "Visitor attraction", query: "visitor attraction" }
];
