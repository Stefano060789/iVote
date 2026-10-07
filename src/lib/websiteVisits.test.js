import { describe, expect, it, vi } from "vitest";
import { isPublicWebsitePath, recordWebsiteVisit } from "./websiteVisits";

function setup() {
  const values = new Map();
  const client = {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) },
    rpc: vi.fn().mockResolvedValue({ error: null })
  };
  return {
    client,
    storage: {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, value)
    },
    pathname: "/",
    consent: "accepted",
    date: "2026-10-07",
    createId: () => "0941d564-05a8-4bd4-b63c-e002ec827f6e"
  };
}

describe("website visit measurement", () => {
  it("excludes private and QR pages", () => {
    for (const path of ["/creator", "/admin", "/vote/123", "/qr/token", "/login", "/register"]) {
      expect(isPublicWebsitePath(path)).toBe(false);
    }
    expect(isPublicWebsitePath("/")).toBe(true);
    expect(isPublicWebsitePath("/essentials")).toBe(true);
  });

  it.each([null, "declined"])("does not measure without consent (%s)", async (consent) => {
    const options = setup();
    await recordWebsiteVisit({ ...options, consent });
    expect(options.client.auth.getSession).not.toHaveBeenCalled();
    expect(options.client.rpc).not.toHaveBeenCalled();
  });

  it("excludes logged-in visitors", async () => {
    const options = setup();
    options.client.auth.getSession.mockResolvedValue({ data: { session: { user: {} } }, error: null });
    await recordWebsiteVisit(options);
    expect(options.client.rpc).not.toHaveBeenCalled();
  });

  it("records once per tab/day despite reloads and public-page navigation", async () => {
    const options = setup();
    await recordWebsiteVisit(options);
    await recordWebsiteVisit(options);
    await recordWebsiteVisit({ ...options, pathname: "/essentials" });
    expect(options.client.rpc).toHaveBeenCalledTimes(1);
    expect(options.client.rpc).toHaveBeenCalledWith("record_website_visit", {
      visitor_session: options.createId()
    });
    await recordWebsiteVisit({ ...options, date: "2026-10-08" });
    expect(options.client.rpc).toHaveBeenCalledTimes(2);
  });

  it("reports failures and permits retry without generating a new identifier", async () => {
    const options = setup();
    options.client.rpc.mockResolvedValueOnce({ error: new Error("Counter unavailable") });
    await expect(recordWebsiteVisit(options)).rejects.toThrow("Counter unavailable");
    await recordWebsiteVisit(options);
    expect(options.client.rpc).toHaveBeenCalledTimes(2);
    expect(options.client.rpc.mock.calls[0]).toEqual(options.client.rpc.mock.calls[1]);
  });

  it("propagates auth failures without recording", async () => {
    const options = setup();
    options.client.auth.getSession.mockResolvedValue({ data: {}, error: new Error("Auth unavailable") });
    await expect(recordWebsiteVisit(options)).rejects.toThrow("Auth unavailable");
    expect(options.client.rpc).not.toHaveBeenCalled();
  });
});
