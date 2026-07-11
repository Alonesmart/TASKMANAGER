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

      <Stack.Screen name="Connexion" options={{ headerShown: false }} />
      
      <Stack.Screen
        name="RegisterScreen"
        options={{
          headerShown: true,
          title: "Créer un compte",
          headerBackTitle: "Retour",
        }}
      />
 
      <Stack.Screen
        name="ForgotPassword"
        options={{
          headerShown: true,
          title: "Mot de passe oublié",
          headerBackTitle: "Retour",
        }}
      />
 
      <Stack.Screen
        name="ResetPassword"
        options={{
          headerShown: true,
          title: "Nouveau mot de passe",
          headerBackTitle: "Retour",
        }}
      />

      <Stack.Screen
        name="AcceptInvitation"
        options={{
          headerShown: true,
          title: "Rejoindre le projet",
          headerBackTitle: "Retour",
        }}
      />
    </Stack>
  );
}
