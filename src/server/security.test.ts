import { describe, expect, it } from "bun:test";
import { isPrivateOrReservedHost, parseHostHeader, validateHostHeader, validateOriginHeader } from "./security.js";

describe("security utils", () => {
  describe("parseHostHeader", () => {
    it("extracts hostname from Host header", () => {
      expect(parseHostHeader("localhost:8504")).toBe("localhost");
      expect(parseHostHeader("127.0.0.1")).toBe("127.0.0.1");
      expect(parseHostHeader("[::1]:8504")).toBe("::1");
      expect(parseHostHeader(undefined)).toBeUndefined();
    });
  });

  describe("validateHostHeader", () => {
    it("validates allowed hosts", () => {
      expect(validateHostHeader("localhost:8504", ["localhost", "127.0.0.1"])).toBe(true);
      expect(validateHostHeader("attacker.site:8504", ["localhost", "127.0.0.1"])).toBe(false);
      expect(validateHostHeader("any.site", true)).toBe(true);
    });

    it("normalizes allowed host entries with ports and schemes", () => {
      expect(validateHostHeader("100.121.192.121:8504", ["100.121.192.121:8504"])).toBe(true);
      expect(validateHostHeader("100.121.192.121", ["100.121.192.121:8504"])).toBe(true);
      expect(validateHostHeader("100.121.192.121:8504", ["http://100.121.192.121:8504"])).toBe(true);
      expect(validateHostHeader("100.121.192.121:8504", ["100.121.192.121"])).toBe(true);
    });

    it("supports wildcard allowed hosts", () => {
      expect(validateHostHeader("random.host:8504", ["*"])).toBe(true);
      expect(validateHostHeader("api.example.com", ["*.example.com"])).toBe(true);
      expect(validateHostHeader("example.com", ["*.example.com"])).toBe(true);
      expect(validateHostHeader("other.com", ["*.example.com"])).toBe(false);
    });
  });

  describe("validateOriginHeader", () => {
    it("validates origin headers against host or allowed hosts", () => {
      expect(validateOriginHeader("http://localhost:8504", "localhost:8504", ["localhost"])).toBe(true);
      expect(validateOriginHeader("https://attacker.site", "localhost:8504", ["localhost"])).toBe(false);
      expect(validateOriginHeader(undefined, "localhost:8504", ["localhost"])).toBe(true);
      expect(validateOriginHeader("http://100.121.192.121:8504", "100.121.192.121:8504", ["100.121.192.121:8504"])).toBe(true);
      expect(validateOriginHeader("http://100.121.192.121:8504", "100.121.192.121:8504", ["*"])).toBe(true);
    });
  });

  describe("createSecurityMiddleware", () => {
    it("dynamically resolves allowedHosts function", async () => {
      let dynamicAllowed: string[] = [];
      const middleware = (await import("./security.js")).createSecurityMiddleware({
        allowedHosts: () => dynamicAllowed,
      });

      const makeContext = (host: string) => ({
        req: {
          path: "/",
          header: (name: string) => (name === "host" ? host : undefined),
          query: () => undefined,
        },
        json: (data: unknown, status: number) => ({ data, status }),
      } as any);

      let nextCalled = false;
      const next = async () => { nextCalled = true; };

      // Initially rejected
      const res1 = await middleware(makeContext("100.121.192.121:8504"), next);
      expect(nextCalled).toBe(false);
      expect(res1).toEqual({ data: { error: "Forbidden: Host not allowed" }, status: 403 });

      // Update allowed hosts dynamically
      dynamicAllowed = ["100.121.192.121"];
      const res2 = await middleware(makeContext("100.121.192.121:8504"), next);
      expect(nextCalled).toBe(true);
      expect(res2).toBeUndefined();
    });
  });

  describe("isPrivateOrReservedHost", () => {
    it("identifies private/loopback/cloud metadata hosts", () => {
      expect(isPrivateOrReservedHost("127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedHost("169.254.169.254")).toBe(true);
      expect(isPrivateOrReservedHost("10.0.0.1")).toBe(true);
      expect(isPrivateOrReservedHost("192.168.1.1")).toBe(true);
      expect(isPrivateOrReservedHost("localhost")).toBe(true);
      expect(isPrivateOrReservedHost("example.com")).toBe(false);
      expect(isPrivateOrReservedHost("fdic.gov")).toBe(false);
      expect(isPrivateOrReservedHost("fcdn.example.com")).toBe(false);
    });
  });
});
