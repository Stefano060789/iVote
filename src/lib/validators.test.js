import { describe, it, expect } from "vitest";
import { isValidEmail, isValidIban, normalizeIban, formatIbanForDisplay } from "./validators";

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

describe("isValidIban", () => {
  it("accepts well-known official IBAN checksum test numbers", () => {
    // These are the standard publicly-documented example/test IBANs used by
    // banking-industry checksum test suites (not real accounts).
    expect(isValidIban("DE89370400440532013000")).toBe(true);
    expect(isValidIban("GB29NWBK60161331926819")).toBe(true);
    expect(isValidIban("FR1420041010050500013M02606")).toBe(true);
    expect(isValidIban("AT611904300234573201")).toBe(true);
  });

  it("accepts an IBAN with spaces exactly as a human would type it", () => {
    expect(isValidIban("DE89 3704 0044 0532 0130 00")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isValidIban("de89370400440532013000")).toBe(true);
  });

  it("rejects a mistyped checksum digit", () => {
    expect(isValidIban("DE89370400440532013001")).toBe(false);
  });

  it("rejects the wrong structure", () => {
    expect(isValidIban("not-an-iban")).toBe(false);
    expect(isValidIban("")).toBe(false);
    expect(isValidIban("D1234567890123456")).toBe(false);
  });
});

describe("normalizeIban / formatIbanForDisplay", () => {
  it("strips spaces and uppercases", () => {
    expect(normalizeIban("de89 3704 0044 0532 0130 00")).toBe("DE89370400440532013000");
  });

  it("formats into 4-character groups for display", () => {
    expect(formatIbanForDisplay("DE89370400440532013000")).toBe("DE89 3704 0044 0532 0130 00");
  });
});
