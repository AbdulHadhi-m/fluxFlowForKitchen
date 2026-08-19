import { create } from "zustand";

export type Theme = "dark" | "light" | "system";

interface ThemeState {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "fluxiflow-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored && ["dark", "light", "system"].includes(stored)) {
    return stored;
  }
  return "dark";
}

function resolveTheme(theme: Theme): "dark" | "light" {
  if (theme === "system") {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }
  return theme;
}

function applyThemeToDOM(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const resolved = resolveTheme(theme);

  if (resolved === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialTheme = getInitialTheme();
  applyThemeToDOM(initialTheme);

  // Set up system preference listener
  if (typeof window !== "undefined") {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (get().theme === "system") {
        const resolved = resolveTheme("system");
        applyThemeToDOM("system");
        set({ resolvedTheme: resolved });
      }
    };
    mediaQuery.addEventListener("change", handleChange);
  }

  return {
    theme: initialTheme,
    resolvedTheme: resolveTheme(initialTheme),
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(STORAGE_KEY, newTheme);
      applyThemeToDOM(newTheme);
      set({
        theme: newTheme,
        resolvedTheme: resolveTheme(newTheme),
      });
    },
    toggleTheme: () => {
      const currentResolved = get().resolvedTheme;
      const nextTheme: Theme = currentResolved === "dark" ? "light" : "dark";
      get().setTheme(nextTheme);
    },
  };
});
