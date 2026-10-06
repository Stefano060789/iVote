export function isReviewedOutreachContact(contact) {
  return contact.business_review_status === "approved" ||
    contact.message_review_status === "approved";
}

export function getOutreachContactIds(contacts) {
  return contacts.map(({ id }) => id);
}

export function filterHiddenOutreachContacts(contacts, hiddenIds) {
  return contacts.filter((contact) =>
    !hiddenIds.has(contact.id) && !isReviewedOutreachContact(contact)
  );
}

export function groupOutreachContactsByCountry(contacts) {
  const groups = new Map();
  for (const contact of contacts) {
    const country = String(contact.country || "").trim() || "Country unknown";
    if (!groups.has(country)) groups.set(country, []);
    groups.get(country).push(contact);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([country, groupedContacts]) => ({ country, contacts: groupedContacts }));
}
