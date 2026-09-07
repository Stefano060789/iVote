export const POLL_TEMPLATES = [
  {
    key: "blank",
    label: "Blank poll",
    question: "",
    answers: [""]
  },
  {
    key: "event-feedback",
    label: "Event feedback",
    question: "How would you rate this event?",
    answers: ["Excellent", "Good", "Average", "Needs improvement"]
  },
  {
    key: "training-evaluation",
    label: "Training evaluation",
    question: "How useful was this training session?",
    answers: ["Very useful", "Useful", "Neutral", "Not useful"]
  },
  {
    key: "customer-satisfaction",
    label: "Customer satisfaction",
    question: "How satisfied are you with our service today?",
    answers: ["Very satisfied", "Satisfied", "Neutral", "Dissatisfied"]
  },
  {
    key: "product-feedback",
    label: "Product feedback",
    question: "How likely are you to recommend this product?",
    answers: ["Very likely", "Likely", "Not sure", "Unlikely"]
  },
  {
    key: "purchase-intent",
    label: "Purchase intent",
    question: "How likely are you to purchase this in the next 30 days?",
    answers: ["Very likely", "Likely", "Maybe later", "Not likely"]
  },
  {
    key: "event-return",
    label: "Event return intent",
    question: "Would you attend another event like this?",
    answers: ["Definitely", "Probably", "Not sure", "No"]
  },
  {
    key: "service-recovery",
    label: "Service recovery",
    question: "Did we resolve your issue today?",
    answers: ["Completely", "Partly", "Not yet"]
  }
];

export function getTemplateByKey(key) {
  return POLL_TEMPLATES.find((template) => template.key === key) ?? POLL_TEMPLATES[0];
}
