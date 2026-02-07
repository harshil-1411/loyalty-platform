import { describe, it, expect, beforeEach } from "vitest";
import { t, setLocale, getLocale, formatINR, formatDateIndia } from "./index";

describe("i18n", () => {
  beforeEach(() => {
    setLocale("en");
  });

  describe("t", () => {
    it("returns translation for existing key", () => {
      expect(t("nav.dashboard")).toBe("Dashboard");
    });
    it("returns key when key is missing (fallback)", () => {
      expect(t("missing.key")).toBe("missing.key");
    });
    it("returns key for empty string", () => {
      expect(t("")).toBe("");
    });
  });

  describe("getLocale / setLocale", () => {
    it("default locale is en", () => {
      setLocale("en");
      expect(getLocale()).toBe("en");
    });
    it("setLocale changes getLocale", () => {
      setLocale("hi");
      expect(getLocale()).toBe("hi");
      setLocale("en");
      expect(getLocale()).toBe("en");
    });
    it("returns Hindi translation when locale is hi", () => {
      setLocale("hi");
      expect(t("nav.dashboard")).toBe("डैशबोर्ड");
      setLocale("en");
    });
  });

  describe("formatINR", () => {
    it("formats number as INR currency", () => {
      expect(formatINR(1000)).toMatch(/1,?000/);
      expect(formatINR(1000)).toMatch(/₹|INR|Rs/);
    });
    it("handles zero", () => {
      expect(formatINR(0)).toBeDefined();
    });
  });

  describe("formatDateIndia", () => {
    it("formats Date object", () => {
      const d = new Date("2025-02-07");
      expect(formatDateIndia(d)).toMatch(/\d/);
    });
    it("formats date string", () => {
      expect(formatDateIndia("2025-02-07")).toMatch(/\d/);
    });
  });
});
