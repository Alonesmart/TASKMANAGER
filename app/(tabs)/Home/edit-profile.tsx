import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/theme";

export default function EditProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>{t("edit_profile.title")}</Text>
          <View style={styles.spacer} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t("edit_profile.full_name")}</Text>
          <TextInput style={styles.input} value="raoul forba" placeholderTextColor="#7d8590" />

          <Text style={styles.label}>{t("edit_profile.email")}</Text>
          <TextInput
            style={styles.input}
            value="raoul@example.com"
            keyboardType="email-address"
            placeholderTextColor="#7d8590"
          />

          <Text style={styles.label}>{t("edit_profile.role")}</Text>
          <TextInput style={styles.input} value={t("edit_profile.admin")} placeholderTextColor="#7d8590" />

          <TouchableOpacity
            style={styles.saveBtn}
            activeOpacity={0.85}
            onPress={() => router.back()}
          >
            <Text style={styles.saveText}>{t("common.save")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: {
  bg: string;
  cardBg: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
}) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  scroll: {
    padding: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  spacer: {
    width: 40,
    height: 40,
  },
  card: {
    backgroundColor: theme.cardBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  label: {
    color: theme.textSecondary,
    marginBottom: 6,
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
  },
  input: {
    backgroundColor: theme.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  saveBtn: {
    marginTop: 18,
    backgroundColor: theme.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
