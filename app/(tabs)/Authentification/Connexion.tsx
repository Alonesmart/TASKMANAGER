import { AntDesign, FontAwesome, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ellipse from "../../../components/Ellipse";
import { useAppTheme } from "../../../theme";
import { API_URL } from "../Root/API_URL";

export default function LoginScreen() {
  // ✅ Tous les hooks INSIDE le composant
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
 
  // ✅ States renommés selon la DB (nom / motdepasse)
  const [email, setEmail] = useState("");
  const [motdepasse, setMotdepasse] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Fonction de connexion corrigée
  const handleLogin = async () => {
    if (!email || !motdepasse) {
      Alert.alert("Erreur", "Remplissez tous les champs");
      return;
    }
 
    try {
      setLoading(true);
 
      // ✅ Correspond exactement au backend : POST /login
      const response = await axios.post(`${API_URL}/login`, {
        email,
        motdepasse,
      });
 
      const token = response.data.access_token;
 
      // ✅ Sauvegarde du token JWT en local
      await AsyncStorage.setItem("access_token", token);
      await AsyncStorage.setItem("user_email", email);
 
      router.push("/(tabs)/Home");
 
    } catch (err: any) {
      const message =
        err?.response?.data?.detail || "Email ou mot de passe incorrect";
      Alert.alert("Erreur", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1b3e" />

    {/* Fond dégradé */}
    <LinearGradient
      colors={["#0d1b3e", "#0f2050", "#0d1b3e"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />

    {/* Orbe haut gauche */}
    <View style={styles.orbTopLeft} />
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
            value={email}
            onChangeText={setEmail}
            textContentType="emailAddress"
            style={styles.input}
          />
          <Ionicons name="mail-outline" size={21} color={theme.textSecondary} />
        </View>

        {/* Password */}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder={t("auth.password")}
            placeholderTextColor={theme.textMuted}
            secureTextEntry={!showPassword} 
            autoCapitalize="none"
            autoComplete="password"
            value={motdepasse}
            onChangeText={setMotdepasse}
            textContentType="password"
            style={styles.input}
          />
           <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={22}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Mot de passe oublié */}
         <TouchableOpacity 
          onPress={() => router.push("/(tabs)/Authentification/ForgotPassword")}>
          <Text style={styles.forgot}>{t("mot de passe oublié")}</Text>
        </TouchableOpacity>

        {/* Lien inscription */}
        <TouchableOpacity 
          onPress={() => router.push("/(tabs)/Authentification/RegisterScreen")}>
          <Text style={styles.signup}>
          {t("auth.no_account")}{" "}
          <Text style={{ color: theme.accent }}>{t("auth.sign_up")}</Text>
      </Text>
        </TouchableOpacity>

          {/* ✅ Bouton appelle handleLogin + spinner pendant chargement */}
        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t("common.login")}</Text>
          )}
        </TouchableOpacity>
        
          {/* ── Divider ── */}
                    <View style={styles.divider}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>Continuer avec</Text>
                      <View style={styles.dividerLine} />
                    </View>

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
    divider: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 18,
      marginBottom: 14,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.border,
    },
    dividerText: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: "500",
    },
    orbTopLeft: {
      position: "absolute",
      top: -50,
      left: -50,
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
  });
