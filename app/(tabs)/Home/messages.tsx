import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import AddButton from "../../../components/AddButton";
import { useAppTheme } from "../../../theme";


export default function Messages() {
  const router = useRouter();
  const { t } = useTranslation();
   const NEW_MESSAGE_ROUTE = "/(tabs)/Home/new-message" as any;
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
      <AddButton
        backgroundColor={theme.accent}
        onPress={() => router.push(NEW_MESSAGE_ROUTE)}
      />
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
  
});
