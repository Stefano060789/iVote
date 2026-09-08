export const POLL_TEMPLATES = [
  {
    key: "blank",
    label: "Blank poll",
    industry: "general",
    question: "",
    answers: [""]
  },
  {
    key: "event-feedback",
    label: "Event feedback",
    industry: "event",
    question: "How would you rate this event?",
    answers: ["Excellent", "Good", "Average", "Needs improvement"]
  },
  {
    key: "training-evaluation",
    label: "Training evaluation",
    industry: "event",
    question: "How useful was this training session?",
    answers: ["Very useful", "Useful", "Neutral", "Not useful"]
  },
  {
    key: "customer-satisfaction",
    label: "Customer satisfaction",
    industry: "general",
    question: "How satisfied are you with our service today?",
    answers: ["Very satisfied", "Satisfied", "Neutral", "Dissatisfied"]
  },
  {
    key: "product-feedback",
    label: "Product feedback",
    industry: "general",
    question: "How likely are you to recommend this product?",
    answers: ["Very likely", "Likely", "Not sure", "Unlikely"]
  },
  {
    key: "purchase-intent",
    label: "Purchase intent",
    industry: "general",
    question: "How likely are you to purchase this in the next 30 days?",
    answers: ["Very likely", "Likely", "Maybe later", "Not likely"]
  },
  {
    key: "event-return",
    label: "Event return intent",
    industry: "event",
    question: "Would you attend another event like this?",
    answers: ["Definitely", "Probably", "Not sure", "No"]
  },
  {
    key: "service-recovery",
    label: "Service recovery",
    industry: "general",
    question: "Did we resolve your issue today?",
    answers: ["Completely", "Partly", "Not yet"]
  },
  {
    key: "restaurant-meal",
    label: "Meal experience",
    industry: "restaurant",
    question: "How was your meal today?",
    answers: ["Excellent", "Good", "Average", "Poor"],
    suggestedPrimaryColor: "#b45309"
  },
  {
    key: "restaurant-service",
    label: "Service speed",
    industry: "restaurant",
    question: "How was the speed of service?",
    answers: ["Very fast", "Fast", "A bit slow", "Too slow"],
    suggestedPrimaryColor: "#b45309"
  },
  {
    key: "gym-class",
    label: "Class experience",
    industry: "gym",
    question: "How was today's class?",
    answers: ["Loved it", "Good", "Okay", "Not for me"],
    suggestedPrimaryColor: "#16a34a"
  },
  {
    key: "gym-facility",
    label: "Facility cleanliness",
    industry: "gym",
    question: "How clean and well-equipped was the gym today?",
    answers: ["Excellent", "Good", "Average", "Needs work"],
    suggestedPrimaryColor: "#16a34a"
  },
  {
    key: "salon-service",
    label: "Salon visit",
    industry: "salon",
    question: "How was your visit with us today?",
    answers: ["Excellent", "Good", "Average", "Disappointing"],
    suggestedPrimaryColor: "#db2777"
  },
  {
    key: "salon-stylist",
    label: "Stylist/therapist rating",
    industry: "salon",
    question: "How would you rate your stylist/therapist today?",
    answers: ["Excellent", "Good", "Average", "Poor"],
    suggestedPrimaryColor: "#db2777"
  },
  {
    key: "healthcare-waiting-room",
    label: "Waiting room experience",
    industry: "healthcare",
    question: "How was your waiting room experience today?",
    answers: ["Very comfortable", "Comfortable", "Okay", "Uncomfortable"],
    suggestedPrimaryColor: "#0369a1"
  },
  {
    key: "healthcare-visit",
    label: "Visit satisfaction",
    industry: "healthcare",
    question: "How satisfied are you with your visit today?",
    answers: ["Very satisfied", "Satisfied", "Neutral", "Dissatisfied"],
    suggestedPrimaryColor: "#0369a1"
  }
];

export const INDUSTRY_LABELS = {
  general: "General",
  event: "Events",
  restaurant: "Restaurants & cafes",
  gym: "Gyms & studios",
  salon: "Salons & spas",
  healthcare: "Healthcare waiting rooms"
};

export function getTemplateByKey(key) {
  return POLL_TEMPLATES.find((template) => template.key === key) ?? POLL_TEMPLATES[0];
}
