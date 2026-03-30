import React, { useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome, AntDesign } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = { bg: "#0d1117", cardBg: "#161b22", accent: "#3d8ef8", textPrimary: "#e6edf3", textSecondary: "#7d8590", border: "#21262d", logoutColor: "#f85030" };
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
            placeholderTextColor="#aaa"
            style={styles.input}
          />
          <Ionicons name="person-circle-outline" size={22} color="#000" />
        </View>

        {/* Password */}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder={t("auth.password")}
            placeholderTextColor="#aaa"
            secureTextEntry
            style={styles.input}
          />
          <Ionicons name="lock-closed-outline" size={20} color="#000" />
        </View>

        {/* Links */}
        <Text style={styles.forgot}>{t("auth.forgot_password")}</Text>
        {/* //< Text style={styles.signup}></Text> */}
       <TouchableOpacity onPress={() => router.push("/(tabs)/Authentification/RegisterScreen")}>
  <Text style={styles.signup}>
    {t("auth.no_account")} <Text style={{ color: "#4da6ff" }}>{t("auth.sign_up")}</Text>
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
    color: "#4da6ff",
    marginBottom: 5,
  },

  signup: {
    color: theme.textPrimary,
    marginBottom: 20,
  },

  button: {
    backgroundColor: theme.accent,
    padding: 12,
    borderRadius: 20,
    alignItems: "center",
    alignSelf: "flex-end",
    width: 100,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",

  },

  social: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    gap: 15,
  },
});
