import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../../theme";

export default function StagesScreen() {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("stages.title")}</Text>
      <Text style={styles.subtitle}>{t("stages.subtitle")}</Text>
    </View>
  );
}

const createStyles = (theme: { bg: string; textPrimary: string; textSecondary: string }) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
});
