import { describe, expect, it } from "vitest";
import {
  filterHiddenOutreachContacts,
  getOutreachContactIds,
  groupOutreachContactsByCountry,
  isReviewedOutreachContact
} from "./outreachDisplay.js";

describe("outreach display filtering", () => {
  it("counts either approved review as reviewed", () => {
    expect(isReviewedOutreachContact({ business_review_status: "approved" })).toBe(true);
    expect(isReviewedOutreachContact({ message_review_status: "approved" })).toBe(true);
    expect(isReviewedOutreachContact({
      business_review_status: "pending",
      message_review_status: "pending"
    })).toBe(false);
  });

  it("always hides reviewed items and filters locally cleaned prospects", () => {
    const contacts = [
      { id: "pending", business_review_status: "pending", message_review_status: "pending" },
      { id: "business-reviewed", business_review_status: "approved", message_review_status: "pending" },
      { id: "message-reviewed", business_review_status: "pending", message_review_status: "approved" }
    ];

    expect(getOutreachContactIds(contacts)).toEqual(["pending", "business-reviewed", "message-reviewed"]);
    expect(filterHiddenOutreachContacts(contacts, new Set()))
      .toEqual([contacts[0]]);
    expect(filterHiddenOutreachContacts(contacts, new Set(["pending"]))).toEqual([]);
  });

  it("groups prospects by country and keeps unclassified prospects together", () => {
    const contacts = [
      { id: "italy", country: "Italy" },
      { id: "unknown", country: null },
      { id: "austria", country: "Austria" },
      { id: "italy-2", country: "Italy" }
    ];

    expect(groupOutreachContactsByCountry(contacts)).toEqual([
      { country: "Austria", contacts: [contacts[2]] },
      { country: "Country unknown", contacts: [contacts[1]] },
      { country: "Italy", contacts: [contacts[0], contacts[3]] }
    ]);
  });
});
