import { AntDesign, FontAwesome, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ellipse from "../../../components/Ellipse";
import { useAppTheme } from "../../../theme";

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Ellipse />

      {/* Titre */}
      <Text style={styles.title}>{t("auth.title_login")}</Text>

      {/* Card */}
      <View style={styles.card}>

        {/* Email */}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder={t("Email")}
            placeholderTextColor={theme.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            style={styles.input}
          />
          <Ionicons name="mail-outline" size={21} color={theme.textSecondary} />
        </View>

        {/* Password */}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder={t("password")}
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            style={styles.input}
          />
          <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} />
        </View>

        {/* Mot de passe oublié */}
        <Text style={styles.forgot}>{t("auth.forgot_password")}</Text>

        {/* Lien inscription */}
        <TouchableOpacity onPress={() => router.push("/(tabs)/Authentification/RegisterScreen")}>
          <Text style={styles.signup}>
            {t("auth.no_account")}{" "}
            <Text style={{ color: theme.accent }}>{t("auth.sign_up")}</Text>
          </Text>
        </TouchableOpacity>

        {/* Bouton de connexion */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/(tabs)/Home")}
        >
          <Text style={styles.buttonText}>{t("common.login")}</Text>
        </TouchableOpacity>

        {/* Social */}
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

    title: {
      fontSize: 32,
      color: theme.textPrimary,
      fontWeight: "bold",
      marginBottom: 20,
    },

    card: {
      width: "85%",
      backgroundColor: theme.cardBg,
      borderRadius: 22,
      padding: 22,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 8,
    },

    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      marginBottom: 18,
      justifyContent: "space-between",
      minHeight: 46,
    },

    input: {
      flex: 1,
      color: theme.textPrimary,
      paddingVertical: 8,
    },

    forgot: {
      color: theme.accent,
      marginBottom: 5,
    },

    signup: {
      color: theme.textSecondary,
      marginBottom: 20,
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
    },

    buttonText: {
      color: "#fff",
      fontWeight: "bold",
      textAlign: "center",
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
