export function isReviewedOutreachContact(contact) {
  return contact.business_review_status === "approved" ||
    contact.message_review_status === "approved";
}

export function getReviewedOutreachContactIds(contacts) {
  return contacts.filter(isReviewedOutreachContact).map(({ id }) => id);
}

export function filterHiddenOutreachContacts(contacts, hiddenIds) {
  return contacts.filter(({ id }) => !hiddenIds.has(id));
}
