import { Stack } from "expo-router";

export default function RootLayout() {
  const theme = { bg: "#0d1117", cardBg: "#161b22", accent: "#3d8ef8", textPrimary: "#e6edf3", textSecondary: "#7d8590", border: "#21262d", logoutColor: "#f85030" };
  const isDark = true;

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        contentStyle: { backgroundColor: theme.bg },
        headerStyle: { backgroundColor: theme.cardBg },
        headerTintColor: theme.textPrimary,
        headerTitleStyle: { color: theme.textPrimary },
        statusBarStyle: isDark ? "light" : "dark",
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
