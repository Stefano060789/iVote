import { describe, it, expect } from "vitest";
import { buildSepaQrPayload } from "./sepaQr";

describe("buildSepaQrPayload", () => {
  it("builds the standard 11-line EPC069-12 structure", () => {
    const payload = buildSepaQrPayload({
      iban: "DE89 3704 0044 0532 0130 00",
      accountHolderName: "Lakeside Cafe",
      bic: "COBADEFFXXX",
      amount: 12.5,
      currency: "EUR",
      message: "Thanks for supporting us"
    });
    const lines = payload.split("\n");
    expect(lines).toHaveLength(11);
    expect(lines[0]).toBe("BCD");
    expect(lines[1]).toBe("002");
    expect(lines[2]).toBe("1");
    expect(lines[3]).toBe("SCT");
    expect(lines[4]).toBe("COBADEFFXXX");
    expect(lines[5]).toBe("Lakeside Cafe");
    expect(lines[6]).toBe("DE89370400440532013000");
    expect(lines[7]).toBe("EUR12.50");
    expect(lines[8]).toBe("");
    expect(lines[10]).toBe("Thanks for supporting us");
  });

  it("leaves the BIC and amount lines blank when not provided", () => {
    const payload = buildSepaQrPayload({ iban: "DE89370400440532013000", accountHolderName: "Lakeside Cafe" });
    const lines = payload.split("\n");
    expect(lines[4]).toBe("");
    expect(lines[7]).toBe("");
  });
});
