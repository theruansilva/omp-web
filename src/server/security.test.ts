import { describe, expect, it } from "bun:test";
import type { Context } from "hono";
import {
  createSecurityMiddleware,
  isPrivateOrReservedHost,
  isPrivateOrReservedHostAsync,
  parseCookie,
  parseHostHeader,
  safeTokenCompare,
  validateHostHeader,
  validateOriginHeader,
} from "./security.js";

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

    it("rejects missing or empty host headers", () => {
      expect(validateHostHeader(undefined, ["localhost"])).toBe(false);
      expect(validateHostHeader("", ["localhost"])).toBe(false);
      expect(validateHostHeader("   ", ["localhost"])).toBe(false);
      expect(validateHostHeader(undefined, true)).toBe(true);
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

  describe("safeTokenCompare", () => {
    it("compares tokens in constant time and handles mismatches", () => {
      expect(safeTokenCompare("secret123", "secret123")).toBe(true);
      expect(safeTokenCompare("wrong", "secret123")).toBe(false);
      expect(safeTokenCompare("", "secret123")).toBe(false);
      expect(safeTokenCompare(undefined, "secret123")).toBe(false);
      expect(safeTokenCompare("secret1234", "secret123")).toBe(false);
    });
  });

  describe("parseCookie", () => {
    it("extracts named cookie from cookie header", () => {
      expect(parseCookie("omp_web_token=abc123xyz", "omp_web_token")).toBe("abc123xyz");
      expect(parseCookie("theme=dark; omp_web_token=abc123xyz; lang=en", "omp_web_token")).toBe("abc123xyz");
      expect(parseCookie("theme=dark; lang=en", "omp_web_token")).toBeUndefined();
      expect(parseCookie(undefined, "omp_web_token")).toBeUndefined();
    });
  });

  describe("isPrivateOrReservedHost & isPrivateOrReservedHostAsync", () => {
    it("identifies private/loopback/cloud metadata hosts", async () => {
      expect(isPrivateOrReservedHost("127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedHost("169.254.169.254")).toBe(true);
      expect(isPrivateOrReservedHost("10.0.0.1")).toBe(true);
      expect(isPrivateOrReservedHost("192.168.1.1")).toBe(true);
      expect(isPrivateOrReservedHost("localhost")).toBe(true);
      expect(isPrivateOrReservedHost("example.com")).toBe(false);
      expect(isPrivateOrReservedHost("fdic.gov")).toBe(false);
      expect(isPrivateOrReservedHost("fcdn.example.com")).toBe(false);

      expect(await isPrivateOrReservedHostAsync("127.0.0.1")).toBe(true);
      expect(await isPrivateOrReservedHostAsync("localhost")).toBe(true);
      expect(await isPrivateOrReservedHostAsync("169.254.169.254")).toBe(true);
    });
  });

  describe("createSecurityMiddleware", () => {
    it("dynamically resolves allowedHosts function", async () => {
      let dynamicAllowed: string[] = [];
      const middleware = createSecurityMiddleware({
        allowedHosts: () => dynamicAllowed,
      });

      const makeContext = (host: string) => ({
        req: {
          path: "/",
          header: (name: string) => (name === "host" ? host : undefined),
          query: () => undefined,
        },
        json: (data: unknown, status: number) => ({ data, status }),
      } as unknown as Context);

      let nextCalled = false;
      const next = async () => { nextCalled = true; };

      // Initially rejected
      const res1 = await middleware(makeContext("100.121.192.121:8504"), next);
      expect(nextCalled).toBe(false);
      expect(res1).toEqual({ data: { error: "Forbidden: Host not allowed" }, status: 403 } as unknown as Response);

      // Update allowed hosts dynamically
      dynamicAllowed = ["100.121.192.121"];
      const res2 = await middleware(makeContext("100.121.192.121:8504"), next);
      expect(nextCalled).toBe(true);
      expect(res2).toBeUndefined();
    });

    it("enforces authentication when authRequired is true", async () => {
      const middleware = createSecurityMiddleware({
        allowedHosts: ["localhost"],
        authRequired: true,
        authToken: "super-secret-token",
      });

      const headersSet: Record<string, string> = {};
      const makeContext = (path: string, headers: Record<string, string> = {}, queryParams: Record<string, string> = {}) => ({
        req: {
          path,
          header: (name: string) => (name === "host" ? "localhost" : headers[name.toLowerCase()]),
          query: (name: string) => queryParams[name],
        },
        json: (data: unknown, status: number) => ({ data, status }),
        html: (data: string, status: number) => ({ data, status }),
        header: (name: string, value: string) => { headersSet[name] = value; },
      } as unknown as Context);

      let nextCalled = false;
      const next = async () => { nextCalled = true; };

      // 1. Missing auth on API route returns 401 JSON
      nextCalled = false;
      const res1 = await middleware(makeContext("/api/projects"), next);
      expect(nextCalled).toBe(false);
      expect(res1).toEqual({ data: { error: "Unauthorized: Invalid or missing auth token" }, status: 401 } as unknown as Response);

      // 2. Missing auth on web route returns 401 HTML
      nextCalled = false;
      const res2 = await middleware(makeContext("/"), next) as unknown as { status: number; data: string };
      expect(nextCalled).toBe(false);
      expect(res2.status).toBe(401);
      expect(res2.data).toContain("PI WEB — Authentication");

      // 3. Valid Bearer token allows request
      nextCalled = false;
      const res3 = await middleware(makeContext("/api/projects", { authorization: "Bearer super-secret-token" }), next);
      expect(nextCalled).toBe(true);
      expect(res3).toBeUndefined();

      // 4. Valid Cookie allows request
      nextCalled = false;
      const res4 = await middleware(makeContext("/api/projects", { cookie: "omp_web_token=super-secret-token" }), next);
      expect(nextCalled).toBe(true);
      expect(res4).toBeUndefined();

      // 5. Valid Query Token on navigation sets cookie and allows
      nextCalled = false;
      const res5 = await middleware(makeContext("/", {}, { token: "super-secret-token" }), next);
      expect(nextCalled).toBe(true);
      expect(res5).toBeUndefined();
      expect(headersSet["Set-Cookie"]).toContain("omp_web_token=super-secret-token");

      // 6. Exempt route allowed without token
      nextCalled = false;
      const res6 = await middleware(makeContext("/api/omp-web/status"), next);
      expect(nextCalled).toBe(true);
      expect(res6).toBeUndefined();
    });
  });
});
