import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
}

const ThemeCtx = createContext<ThemeContextValue>({
  theme: "system",
  resolved: "dark",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeCtx);
}

function getSystemPref(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function apply(resolved: "light" | "dark") {
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}

const STORAGE_KEY = "drape-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "system";
  });

  const resolved = theme === "system" ? getSystemPref() : theme;

  useEffect(() => { apply(resolved); }, [resolved]);
  useEffect(() => {
    if (theme !== "system") { localStorage.setItem(STORAGE_KEY, theme); return; }
    localStorage.removeItem(STORAGE_KEY);
  }, [theme]);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { if (theme === "system") apply(getSystemPref()); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeCtx.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}
