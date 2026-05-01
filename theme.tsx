import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform, useColorScheme } from "react-native";

export type AppThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "app-theme-mode";

const isThemeMode = (value: unknown): value is AppThemeMode =>
  value === "light" || value === "dark" || value === "system";

const getAsyncStorage = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require("@react-native-async-storage/async-storage");
    const storage = module?.default ?? module;
    if (
      storage &&
      typeof storage.getItem === "function" &&
      typeof storage.setItem === "function"
    ) {
      return storage;
    }
  } catch {
    return null;
  }

  return null;
};

const readStoredThemeMode = async (): Promise<AppThemeMode | null> => {
  try {
    if (Platform.OS === "web" && typeof globalThis.localStorage !== "undefined") {
      const stored = globalThis.localStorage.getItem(STORAGE_KEY);
      return isThemeMode(stored) ? stored : null;
    }

    const storage = getAsyncStorage();
    if (!storage) {
      return null;
    }

    const stored = await storage.getItem(STORAGE_KEY);
    return isThemeMode(stored) ? stored : null;
  } catch {
    return null;
  }
};

const saveStoredThemeMode = async (mode: AppThemeMode) => {
  try {
    if (Platform.OS === "web" && typeof globalThis.localStorage !== "undefined") {
      globalThis.localStorage.setItem(STORAGE_KEY, mode);
      return;
    }

    const storage = getAsyncStorage();
    if (!storage) {
      return;
    }

    await storage.setItem(STORAGE_KEY, mode);
  } catch {
    // Theme changes should keep working even if persistence is unavailable.
  }
};

export const appThemes = {
  light: {
    mode: "light" as const,
    bg: "#f4f7fb",
    surface: "#ffffff",
    cardBg: "#ffffff",
    card: "#ffffff",
    cardBorder: "#d9e2ef",
    border: "#d9e2ef",
    bar: "#ffffff",
    barBorder: "#d9e2ef",
    accent: "#1d6ef5",
    accentSoft: "#1d6ef518",
    accentGlow: "#1d6ef520",
    accentDim: "#1d6ef540",
    activeBg: "#1d6ef514",
    text: "#111827",
    textPrimary: "#111827",
    textSecondary: "#526173",
    textMuted: "#8a97a8",
    textDim: "#8a97a8",
    inactive: "#8a97a8",
    logoutColor: "#d92d20",
    success: "#2e7d32",
    warning: "#f59e0b",
    danger: "#d92d20",
    pause: "#7c3aed",
  },
  dark: {
    mode: "dark" as const,
    bg: "#0d1117",
    surface: "#0f1520",
    cardBg: "#161b22",
    card: "#161b22",
    cardBorder: "#21262d",
    border: "#21262d",
    bar: "#0d1520",
    barBorder: "#1a2535",
    accent: "#3d8ef8",
    accentSoft: "#3d8ef818",
    accentGlow: "#3d8ef820",
    accentDim: "#3d8ef840",
    activeBg: "#3d8ef814",
    text: "#e6edf3",
    textPrimary: "#e6edf3",
    textSecondary: "#7d8590",
    textMuted: "#4a6b8a",
    textDim: "#4a6b8a",
    inactive: "#64748b",
    logoutColor: "#f85030",
    success: "#4caf50",
    warning: "#ff9800",
    danger: "#f44336",
    pause: "#9c27b0",
  },
};

export type AppTheme = (typeof appThemes)[keyof typeof appThemes];

type AppThemeContextValue = {
  mode: AppThemeMode;
  setMode: (mode: AppThemeMode) => void;
  isDark: boolean;
  theme: AppTheme;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<AppThemeMode>("dark");

  useEffect(() => {
    void readStoredThemeMode().then((stored) => {
      if (stored) {
        setModeState(stored);
      }
    });
  }, []);

  const setMode = (nextMode: AppThemeMode) => {
    setModeState(nextMode);
    void saveStoredThemeMode(nextMode);
  };

  const resolvedMode = mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;
  const value = useMemo(
    () => ({
      mode,
      setMode,
      isDark: resolvedMode === "dark",
      theme: appThemes[resolvedMode],
    }),
    [mode, resolvedMode]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(AppThemeContext);
  if (!value) {
    throw new Error("useAppTheme must be used inside AppThemeProvider");
  }
  return value;
}
