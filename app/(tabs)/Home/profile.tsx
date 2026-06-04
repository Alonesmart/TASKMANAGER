import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Card, Divider, List, Switch } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { setAppLanguage } from "../../i18n";
import { useAppTheme } from "@/theme";

const LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const { t, i18n: i18nInstance } = useTranslation();
  const { theme, mode: themeMode, setMode: setThemeMode, isDark } = useAppTheme();
  const [showLanguageOptions, setShowLanguageOptions] = useState(false);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const selectedLanguage: (typeof LANGUAGES)[number]["code"] =
    i18nInstance.resolvedLanguage?.startsWith("en") ? "en" : "fr";

  const handleLanguageSelect = async (language: (typeof LANGUAGES)[number]["code"]) => {
    setShowLanguageOptions(false);
    await setAppLanguage(language);
  };

  const Avatar = ({ name }: { name: string }) => (
    <View style={styles.avatarWrapper}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{name.charAt(0).toLowerCase()}</Text>
      </View>
      <Text style={styles.userName}>{name}</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{t("profile.admin")}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.bg} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Avatar name="raoul forba" />
        </View>

       
        <Card style={styles.paperCard} mode="elevated">
          <List.Section>
            <List.Subheader>{t("profile.account").toUpperCase()}</List.Subheader>
            <List.Item
              title={t("profile.edit_profile")}
              left={(props) => <List.Icon {...props} icon="account-edit-outline" color={theme.accent} />}
              onPress={() => router.push("/(tabs)/Home/edit-profile")}
            />
            <Divider />
            <List.Subheader>{t("profile.appearance").toUpperCase()}</List.Subheader>
            <List.Item
              title={t("profile.dark_mode")}
              description={themeMode === "dark" ? t("profile.active") : undefined}
              left={(props) => <List.Icon {...props} icon="moon-waning-crescent" color={theme.accent} />}
              right={() => (
                <Switch value={isDark} onValueChange={() => setThemeMode(isDark ? "light" : "dark")} />
              )}
            />
            <Divider />
            <List.Accordion
              title={t("common.language")}
              description={LANGUAGES.find((l) => l.code === selectedLanguage)?.label ?? "Français"}
              left={(props) => <List.Icon {...props} icon="translate" color={theme.accent} />}
              expanded={showLanguageOptions}
              onPress={() => setShowLanguageOptions((prev) => !prev)}
            >
              {LANGUAGES.map((language) => (
                <List.Item
                  key={language.code}
                  title={language.label}
                  onPress={() => handleLanguageSelect(language.code)}
                  right={(props) =>
                    language.code === selectedLanguage ? <List.Icon {...props} icon="check" color={theme.accent} /> : null
                  }
                />
              ))}
            </List.Accordion>
            <Divider />
            <List.Subheader>{t("profile.about").toUpperCase()}</List.Subheader>
            <List.Item
              title={t("common.version")}
              description="1.0.0"
              left={(props) => <List.Icon {...props} icon="information-outline" color={theme.accent} />}
              onPress={() => Alert.alert(t("common.version"), "1.0.0")}
            />
            <List.Item
              title={t("profile.logout")}
              titleStyle={styles.logoutText}
              left={(props) => <List.Icon {...props} icon="logout" color={theme.logoutColor} />}
              onPress={() => Alert.alert(t("profile.logout"), t("profile.logout_pending"))}
            />
          </List.Section>
        </Card>

        <View style={{ height: 100 }} />
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
  logoutColor: string;
}) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    scroll: {
      paddingBottom: 20,
    },
    header: {
      backgroundColor: theme.cardBg,
      marginHorizontal: 12,
      marginTop: 12,
      borderRadius: 14,
      paddingVertical: 24,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
    },
  avatarWrapper: { alignItems: "center", gap: 8 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "700" },
  userName: { color: theme.textPrimary, fontSize: 16, fontWeight: "600" },
  badge: {
    backgroundColor: theme.accent + "33",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginTop: 2,
  },
  badgeText: { color: theme.accent, fontSize: 12, fontWeight: "500" },
  paperCard: {
    marginTop: 16,
    marginHorizontal: 12,
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  logoutText: { color: "#f85030", fontSize: 15, fontWeight: "500" },
  });
