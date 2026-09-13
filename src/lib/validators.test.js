import { describe, it, expect } from "vitest";
import { isValidEmail } from "./validators";

describe("isValidEmail", () => {
  it("accepts well-formed addresses", () => {
    expect(isValidEmail("guest@example.com")).toBe(true);
    expect(isValidEmail("  guest@example.com  ")).toBe(true);
    expect(isValidEmail("first.last+tag@sub.example.co.uk")).toBe(true);
  });

  it("rejects missing @ or domain dot", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("missing@dot")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("guest@")).toBe(false);
  });

  it("rejects blank, whitespace-only, or overly long input", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("   ")).toBe(false);
    expect(isValidEmail(`${"a".repeat(315)}@b.com`)).toBe(false);
  });

  it("rejects embedded spaces", () => {
    expect(isValidEmail("guest name@example.com")).toBe(false);
    expect(isValidEmail("guest@exa mple.com")).toBe(false);
  });
});
