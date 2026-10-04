import { afterEach, describe, expect, it, vi } from "vitest";
import { lookup } from "node:dns/promises";
import { findPublicBusinessEmail } from "./publicBusinessEmail.js";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn()
}));

function htmlResponse(html, status = 200, headers = {}) {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", ...headers }
  });
}

describe("findPublicBusinessEmail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("finds and prioritizes a published business email from its official site", async () => {
    vi.mocked(lookup).mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    vi.stubGlobal("fetch", vi.fn(async () => htmlResponse(`
      <html><body>
        <a href="mailto:info@example.com">Email us</a>
        <a href="mailto:owner@example.com">Owner</a>
      </body></html>
    `)));

    await expect(findPublicBusinessEmail("https://example.com"))
      .resolves.toEqual({ email: "info@example.com", status: "found" });
  });

  it("checks contact pages and normalizes simple public email obfuscation", async () => {
    vi.mocked(lookup).mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const fetchMock = vi.fn(async (url) => String(url).endsWith("/contact")
      ? htmlResponse("<p>Write to bookings [at] example.com</p>")
      : htmlResponse('<a href="/contact">Contact us</a>'));
    vi.stubGlobal("fetch", fetchMock);

    await expect(findPublicBusinessEmail("https://example.com"))
      .resolves.toEqual({ email: "bookings@example.com", status: "found" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not fetch local or private network websites", async () => {
    vi.mocked(lookup).mockResolvedValue([{ address: "192.168.1.20", family: 4 }]);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(findPublicBusinessEmail("http://example.com"))
      .resolves.toEqual({ email: null, status: "unsafe_website" });
    await expect(findPublicBusinessEmail("http://127.0.0.1"))
      .resolves.toEqual({ email: null, status: "unsafe_website" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not follow redirects to a different hostname", async () => {
    vi.mocked(lookup).mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const fetchMock = vi.fn(async () => new Response(null, {
      status: 302,
      headers: { Location: "https://attacker.example/" }
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(findPublicBusinessEmail("https://example.com"))
      .resolves.toEqual({ email: null, status: "unsafe_website" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports listings without a website without making network requests", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(findPublicBusinessEmail(null))
      .resolves.toEqual({ email: null, status: "no_website" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
