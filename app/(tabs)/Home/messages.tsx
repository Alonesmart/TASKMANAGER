import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/theme";
import { userService } from "@/services/userService";
import AddButton from "../../../components/AddButton";


export default function Messages() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await userService.getCurrentUser();
        setIsAdmin(user?.role === "admin");
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };
    fetchUser();
  }, [isFocused]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("messages.title")}</Text>
      </View>

      
    
      <View style={styles.center}>
        <View style={styles.circle}>
          <Ionicons name="chatbubble-ellipses" size={90} color="#1ada6a" />
        </View>

        <Text style={styles.main}>{t("messages.no_conversation")}</Text>
        <Text style={styles.sub}>
          {t("messages.start_conversation")}
        </Text>
      </View>

      {isAdmin && (
        <AddButton
          onPress={() => router.push("/(tabs)/Home/new-message")}
          backgroundColor={theme.accent}
          accessibilityLabel="Ajouter un message"
          shadowColor={theme.accent}
          size={56}
          iconSize={32}
          style={styles.floatingAddButton}
        />
      )}
    </View>
  );
}

const createStyles = (theme: {
  bg: string;
  cardBg: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
}) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 20 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: { color: theme.textPrimary, fontSize: 20, fontWeight: "bold" },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.cardBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  main: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: "bold",
  },

  sub: {
    color: theme.textSecondary,
    textAlign: "center",
    marginTop: 5,
  },
  floatingAddButton: {
    bottom: 90,
    right: 20,
    borderWidth: 1,
    borderColor: theme.accent + "66",
  },
  
});
