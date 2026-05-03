import React, { useMemo } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { FontAwesome, AntDesign } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../../theme";
import Ellipse from "../../../components/Ellipse";

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Ellipse />

      <View style={styles.formContent}>
        <Text style={styles.title}>{t("auth.register_title")}</Text>

        <View style={styles.card}>
          <TextInput
            placeholder={t("name")}
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="name"
            textContentType="name"
            style={styles.input}
          />

          <TextInput
            placeholder={t("phone")}
            placeholderTextColor={theme.textMuted}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoComplete="tel"
            textContentType="telephoneNumber"
            style={styles.input}
          />

          <TextInput
            placeholder={t("password")}
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            style={styles.input}
          />

          <TextInput
            placeholder={t("auth.repeat_password")}
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            style={styles.input}
          />

          <TouchableOpacity onPress={() => router.push("/(tabs)/Authentification/Connexion")}>
            <Text style={styles.text}>
              {t("auth.already_account")} <Text style={styles.link}>{t("auth.sign_in")}</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={() => router.push("/(tabs)/Authentification/Connexion")}>
            <Text style={styles.buttonText}>{t("auth.create_account")}</Text>
          </TouchableOpacity>

          <View style={styles.social}>
            <TouchableOpacity
              accessibilityLabel="Continuer avec Facebook"
              style={styles.socialButton}
              activeOpacity={0.75}
            >
              <FontAwesome name="facebook" size={22} color="#1877F2" />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Continuer avec Google"
              style={styles.socialButton}
              activeOpacity={0.75}
            >
              <AntDesign name="google" size={22} color="#DB4437" />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Continuer avec LinkedIn"
              style={styles.socialButton}
              activeOpacity={0.75}
            >
              <FontAwesome name="linkedin" size={22} color="#0077B5" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: {
  bg: string;
  cardBg: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
}) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  formContent: {
    alignItems: "center",
    transform: [{ translateY: 35 }],
    width: "100%",
  },
  title: {
    fontSize: 34,
    color: theme.textPrimary,
    fontWeight: "bold",
    marginBottom: 30,
  },
  card: {
    width: "85%",
    backgroundColor: theme.cardBg,
    borderRadius: 30,
    padding: 25,
    borderWidth: 1,
    borderColor: theme.border,
  },
  input: {
    backgroundColor: theme.bg,
    color: theme.textPrimary,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 25,
    padding: 12,
    marginBottom: 12,
  },
  text: {
    marginTop: 5,
    color: theme.textSecondary,
  },
  link: {
    color: theme.accent,
    fontWeight: "bold",
  },
button: {
      backgroundColor: theme.accent,
      paddingVertical: 13,
      borderRadius: 14,
      alignItems: "center",
      alignSelf: "center",
      width: "100%",
      shadowColor: theme.accent,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28,
      shadowRadius: 14,
      elevation: 6,
    },  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  social: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    gap: 12,
  },
  socialButton: {
    width: 54,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
});
