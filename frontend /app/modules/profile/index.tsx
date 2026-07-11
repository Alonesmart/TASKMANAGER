import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import { useAppTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, Divider, List, Switch } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { setAppLanguage } from "../../i18n";

const LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
] as const;

interface UserProfile {
  id: number;
  nom: string;
  email: string;
  role: string;
  phone?: string | null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { t, i18n: i18nInstance } = useTranslation();
  const { theme, mode: themeMode, setMode: setThemeMode, isDark } = useAppTheme();
  const [showLanguageOptions, setShowLanguageOptions] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [helpVisible, setHelpVisible] = useState(false);
  
  const styles = useMemo(() => createStyles(theme), [theme]);
  const selectedLanguage: (typeof LANGUAGES)[number]["code"] =
    i18nInstance.resolvedLanguage?.startsWith("en") ? "en" : "fr";

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const userData = await userService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      Alert.alert(t("common.error"), t("profile.fetch_error"));
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageSelect = async (language: (typeof LANGUAGES)[number]["code"]) => {
    setShowLanguageOptions(false);
    await setAppLanguage(language);
  };

  const handleLogout = () => {
    Alert.alert(
      t("profile.logout"),
      t("profile.logout_confirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("profile.logout"),
          style: "destructive",
          onPress: async () => {
            await authService.logout();
            router.replace("/(tabs)/Authentification");
          },
        },
      ]
    );
  };

  const Avatar = ({ name, role }: { name: string; role: string }) => (
    <View style={styles.avatarWrapper}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.userName}>{name}</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{role.toUpperCase()}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.bg} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Avatar name={user?.nom || "User"} role={user?.role || "User"} />
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
              title="Centre d'Aide & FAQ"
              left={(props) => <List.Icon {...props} icon="help-circle-outline" color={theme.accent} />}
              onPress={() => setHelpVisible(true)}
            />
            <List.Item
              title={t("profile.logout")}
              titleStyle={styles.logoutText}
              left={(props) => <List.Icon {...props} icon="logout" color={theme.logoutColor} />}
              onPress={handleLogout}
            />
          </List.Section>
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Help & FAQ Modal */}
      <Modal
        visible={helpVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setHelpVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalEyebrow}>Support</Text>
                <Text style={styles.modalTitle}>Centre d'Aide & FAQ</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setHelpVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.docSubtitle}>1. Guide Collaborateur</Text>
              <Text style={styles.docParagraph}>
                Visualisez vos tâches affectées via les trois onglets (Liste, Kanban et Calendrier). Joignez des documents et répondez aux invitations de réunions dans l'onglet Dédié.
              </Text>

              <Text style={styles.docSubtitle}>2. Guide Chef de Projet</Text>
              <Text style={styles.docParagraph}>
                Planifiez des réunions et affectez intelligemment les tâches à l'aide de l'aide à la décision IA pour équilibrer la charge de travail de l'équipe.
              </Text>

              <Text style={styles.docSubtitle}>3. Guide Administrateur</Text>
              <Text style={styles.docParagraph}>
                Gérez les accès, affectez les rôles des membres et suivez la progression globale des projets de la structure.
              </Text>

              <Text style={styles.docSubtitle}>4. Foire Aux Questions (FAQ)</Text>
              <Text style={styles.docBullet}>- Comment fonctionne l'IA ?</Text>
              <Text style={styles.docParagraph}>
                Elle analyse localement l'échéance et la charge des membres de l'équipe pour optimiser les décisions de gestion de projets.
              </Text>
              
              <Text style={styles.docBullet}>- Mes données sont-elles partagées ?</Text>
              <Text style={styles.docParagraph}>
                Non. Toutes les analyses IA, descriptions et données de projets sont stockées et calculées localement. Aucune information n'est envoyée à l'extérieur.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "86%",
    backgroundColor: theme.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 12,
  },
  modalEyebrow: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  modalTitle: {
    color: theme.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalScrollContent: {
    paddingBottom: 20,
    gap: 10,
  },
  docSubtitle: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 10,
  },
  docParagraph: {
    color: theme.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  docBullet: {
    color: theme.accent,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
  },
  logoutText: { color: "#f85030", fontSize: 15, fontWeight: "500" },
  });
