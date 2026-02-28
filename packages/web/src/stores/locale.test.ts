import { describe, it, expect, beforeEach } from "vitest";
import { useLocaleStore } from "./locale";

describe("useLocaleStore", () => {
  beforeEach(() => {
    // Reset store to initial state
    useLocaleStore.setState({ locale: "en" });
  });

  it("has a default locale", () => {
    const state = useLocaleStore.getState();
    expect(state.locale === "en" || state.locale === "hi").toBe(true);
  });

  it("setLocale updates locale to hi", () => {
    useLocaleStore.getState().setLocale("hi");
    expect(useLocaleStore.getState().locale).toBe("hi");
  });

  it("setLocale updates locale to en", () => {
    useLocaleStore.getState().setLocale("en");
    expect(useLocaleStore.getState().locale).toBe("en");
  });

  it("setLocale updates document.documentElement.lang to hi", () => {
    useLocaleStore.getState().setLocale("hi");
    expect(document.documentElement.lang).toBe("hi");
  });

  it("setLocale updates document.documentElement.lang to en for non-hi locales", () => {
    useLocaleStore.getState().setLocale("en");
    expect(document.documentElement.lang).toBe("en");
  });
});
