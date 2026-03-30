import React, { useMemo } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome, AntDesign } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = { bg: "#0d1117", cardBg: "#161b22", accent: "#3d8ef8", textPrimary: "#e6edf3", textSecondary: "#7d8590", border: "#21262d", logoutColor: "#f85030" };
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#4A90E2", "#1F3C68"]}
        start={{ x: 3, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ellipse}
      />

      <Text style={styles.title}>{t("auth.register_title")}</Text>

      <View style={styles.card}>
        <TextInput
          placeholder={t("auth.name")}
          placeholderTextColor="#666"
          style={styles.input}
        />

        <TextInput
          placeholder={t("auth.phone")}
          placeholderTextColor="#666"
          style={styles.input}
        />

        <TextInput
          placeholder={t("auth.password")}
          placeholderTextColor="#666"
          secureTextEntry
          style={styles.input}
        />

        <TextInput
          placeholder={t("auth.repeat_password")}
          placeholderTextColor="#666"
          secureTextEntry
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
          <FontAwesome name="facebook" size={28} color="#1877F2" />
          <AntDesign name="google" size={28} color="#DB4437" />
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
    left: -250,
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
    color: "#4da6ff",
    fontWeight: "bold",
  },
  button: {
    backgroundColor: theme.accent,
    padding: 12,
    borderRadius: 25,
    marginTop: 15,
    alignSelf: "flex-end",
    paddingHorizontal: 25,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  social: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    gap: 25,
  },
});
