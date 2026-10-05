export const RESEARCH_COUNTRIES = ["Austria", "Italy", "Malaysia"];

export const RESEARCH_BUSINESS_TYPES = [
  {
    id: "hotel",
    label: "Hotel",
    query: "hotel",
    fitPriority: 5,
    fitReason: "guests have multiple in-person touchpoints where timely feedback can guide service improvements"
  },
  {
    id: "bed-and-breakfast",
    label: "Bed and breakfast",
    query: "bed and breakfast",
    fitPriority: 5,
    fitReason: "guest stays create natural moments to collect feedback and improve the experience"
  },
  {
    id: "cafe",
    label: "Cafe",
    query: "cafe",
    fitPriority: 4,
    fitReason: "tables and counter service offer practical QR touchpoints for quick customer feedback"
  },
  {
    id: "restaurant",
    label: "Restaurant",
    query: "restaurant",
    fitPriority: 5,
    fitReason: "the dining journey offers several clear moments to learn what guests value"
  },
  {
    id: "art-gallery",
    label: "Art gallery",
    query: "art gallery",
    fitPriority: 4,
    fitReason: "exhibitions can use QR feedback to learn what visitors notice and remember"
  },
  {
    id: "museum",
    label: "Museum",
    query: "museum",
    fitPriority: 4,
    fitReason: "exhibits and visitor journeys create specific moments for experience feedback"
  },
  {
    id: "artist-studio",
    label: "Artist / studio",
    query: "artist studio",
    fitPriority: 3,
    fitReason: "studio visits, classes, and events can give visitors a direct feedback channel"
  },
  {
    id: "cultural-venue",
    label: "Cultural venue",
    query: "cultural venue",
    fitPriority: 4,
    fitReason: "programs and in-person visits create opportunities to learn what audiences value"
  },
  {
    id: "event-venue",
    label: "Event venue",
    query: "event venue",
    fitPriority: 5,
    fitReason: "events have clear entry, activity, and exit moments for measuring engagement"
  },
  {
    id: "real-estate-agency",
    label: "Real estate agency",
    query: "real estate agency",
    fitPriority: 4,
    fitReason: "property listings and viewings create useful moments to learn buyer preferences",
    countryQueries: {
      Austria: "Immobilienmakler",
      Italy: "agenzia immobiliare"
    }
  },
  {
    id: "tour-operator",
    label: "Tour operator",
    query: "tour operator",
    fitPriority: 5,
    fitReason: "tours have defined experiences where visitors can share timely feedback"
  },
  {
    id: "visitor-attraction",
    label: "Visitor attraction",
    query: "visitor attraction",
    fitPriority: 5,
    fitReason: "visitor feedback at key points can show which parts of an attraction resonate"
  },
  {
    id: "retail-store",
    label: "Retail store",
    query: "retail store",
    fitPriority: 4,
    fitReason: "in-store QR placements can collect product and service feedback at the point of experience"
  }
];
