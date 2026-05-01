import { AntDesign, FontAwesome, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
import { useAppTheme } from "../../../theme";

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.container}>

      {/* Ellipse en dégradé */}
           <LinearGradient
             colors={["#4A90E2", "#1F3C68"]}
             start={{ x: 3, y: 0 }}
             end={{ x: 1, y: 1 }}
             style={styles.ellipse}
           />

      {/* Titre */}
      <Text style={styles.title}>{t("auth.title_login")}</Text>

      {/* Card */}
      <View style={styles.card}>

        {/* Username */}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder={t("auth.username")}
            placeholderTextColor={theme.textMuted}
            style={styles.input}
          />
          <Ionicons name="person-circle-outline" size={22} color={theme.textSecondary} />
        </View>

        {/* Password */}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder={t("auth.password")}
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            style={styles.input}
          />
          <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} />
        </View>

        {/* Links */}
        <Text style={styles.forgot}>{t("auth.forgot_password")}</Text>
        {/* //< Text style={styles.signup}></Text> */}
       <TouchableOpacity onPress={() => router.push("/(tabs)/Authentification/RegisterScreen")}>
  <Text style={styles.signup}>
    {t("auth.no_account")} <Text style={{ color: theme.accent }}>{t("auth.sign_up")}</Text>
  </Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.button}
  onPress={() => router.push("/(tabs)/Home")}
>
  <Text style={styles.buttonText}>{t("common.login")}</Text>
</TouchableOpacity>
        {/* Social */}
        <View style={styles.social}>
          <FontAwesome name="facebook" size={22} color="#1877F2" />
          <AntDesign name="google" size={22} color="#DB4437" />
          <FontAwesome name="linkedin" size={28} color="#0077B5" />
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

 ellipse: {
    position: "absolute",
    width: 550,
    height: 550,
    borderRadius: 325,
    top: -300,
    left: -250
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
    borderRadius: 25,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    marginBottom: 20,
    justifyContent: "space-between",
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
    padding: 12,
    borderRadius: 20,
    alignItems: "center",
    textAlign: "center",
    alignSelf: "center",
    width: 180,
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
    gap: 15,
  },
});
