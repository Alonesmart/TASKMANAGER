import { Stack } from "expo-router";
import { useAppTheme } from "../../../theme";

export default function RootLayout() {
  const { theme, isDark } = useAppTheme();

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
