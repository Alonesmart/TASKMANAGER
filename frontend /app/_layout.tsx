import React from "react";
import { Stack } from "expo-router";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";
import { AppThemeProvider, useAppTheme } from "../theme";

import "./i18n";

function RootLayoutContent() {
  const { theme, isDark } = useAppTheme();
  const basePaperTheme = isDark ? MD3DarkTheme : MD3LightTheme;
  const paperTheme = {
    ...basePaperTheme,
    colors: {
      ...basePaperTheme.colors,
      primary: theme.accent,
      background: theme.bg,
      surface: theme.cardBg,
      onSurface: theme.textPrimary,
      onBackground: theme.textPrimary,
      outline: theme.border,
    },
  };

  return (
    <PaperProvider theme={paperTheme}>
      <Stack screenOptions={{ headerShown: false }} />
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutContent />
    </AppThemeProvider>
  );
}
