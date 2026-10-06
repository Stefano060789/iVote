import { describe, expect, it } from "vitest";
import {
  filterHiddenOutreachContacts,
  getReviewedOutreachContactIds,
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

  it("returns reviewed IDs and filters only locally hidden contacts", () => {
    const contacts = [
      { id: "pending", business_review_status: "pending", message_review_status: "pending" },
      { id: "business-reviewed", business_review_status: "approved", message_review_status: "pending" },
      { id: "message-reviewed", business_review_status: "pending", message_review_status: "approved" }
    ];

    expect(getReviewedOutreachContactIds(contacts)).toEqual(["business-reviewed", "message-reviewed"]);
    expect(filterHiddenOutreachContacts(contacts, new Set(["business-reviewed"])))
      .toEqual([contacts[0], contacts[2]]);
  });
});
