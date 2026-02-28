import { describe, it, expect, beforeEach, vi } from "vitest";
import { useUIStore, initTheme } from "./ui";

// jsdom does not implement matchMedia — provide a minimal mock
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe("useUIStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({ mobileMenuOpen: false, theme: "system" });
    vi.clearAllMocks();
  });

  it("default state has mobileMenuOpen=false", () => {
    expect(useUIStore.getState().mobileMenuOpen).toBe(false);
  });

  it("setMobileMenuOpen sets to true", () => {
    useUIStore.getState().setMobileMenuOpen(true);
    expect(useUIStore.getState().mobileMenuOpen).toBe(true);
  });

  it("setMobileMenuOpen sets to false", () => {
    useUIStore.setState({ mobileMenuOpen: true });
    useUIStore.getState().setMobileMenuOpen(false);
    expect(useUIStore.getState().mobileMenuOpen).toBe(false);
  });

  it("toggleMobileMenu flips the state", () => {
    useUIStore.setState({ mobileMenuOpen: false });
    useUIStore.getState().toggleMobileMenu();
    expect(useUIStore.getState().mobileMenuOpen).toBe(true);
    useUIStore.getState().toggleMobileMenu();
    expect(useUIStore.getState().mobileMenuOpen).toBe(false);
  });

  it("setTheme stores theme in localStorage", () => {
    useUIStore.getState().setTheme("dark");
    expect(localStorage.getItem("lp-theme")).toBe("dark");
    expect(useUIStore.getState().theme).toBe("dark");
  });

  it("setTheme to light updates state", () => {
    useUIStore.getState().setTheme("light");
    expect(useUIStore.getState().theme).toBe("light");
  });

  it("setTheme to system updates state", () => {
    useUIStore.getState().setTheme("system");
    expect(useUIStore.getState().theme).toBe("system");
  });

  it("setTheme applies dark class when theme is dark", () => {
    useUIStore.getState().setTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("setTheme removes dark class when theme is light", () => {
    document.documentElement.classList.add("dark");
    useUIStore.getState().setTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("initTheme", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("runs without error when called", () => {
    expect(() => initTheme()).not.toThrow();
  });

  it("applies stored theme on init", () => {
    localStorage.setItem("lp-theme", "dark");
    initTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
