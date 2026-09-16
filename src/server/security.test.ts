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
  });

  describe("validateOriginHeader", () => {
    it("validates origin headers against host or allowed hosts", () => {
      expect(validateOriginHeader("http://localhost:8504", "localhost:8504", ["localhost"])).toBe(true);
      expect(validateOriginHeader("https://attacker.site", "localhost:8504", ["localhost"])).toBe(false);
      expect(validateOriginHeader(undefined, "localhost:8504", ["localhost"])).toBe(true);
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
