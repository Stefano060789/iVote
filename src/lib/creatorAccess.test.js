import { describe, expect, it } from "vitest";
import { isCreatorEmail } from "./creatorAccess.js";

describe("isCreatorEmail", () => {
  it("allows both Creator account owners", () => {
    expect(isCreatorEmail("bonomistefano@outlook.it")).toBe(true);
    expect(isCreatorEmail("afelix470@gmail.com")).toBe(true);
  });

  it("matches addresses without case sensitivity", () => {
    expect(isCreatorEmail("AFELIX470@GMAIL.COM")).toBe(true);
  });
});
