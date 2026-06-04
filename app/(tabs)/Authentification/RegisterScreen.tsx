import { authService } from "@/services/authService";
import { AntDesign, FontAwesome, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react"; // ✅ un seul import React
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ellipse from "../../../components/Ellipse";
import { useAppTheme } from "../../../theme";
 

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);


  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [motdepasse, setMotdepasse] = useState("");
  const [confirmMotdepasse, setConfirmMotdepasse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
 
  // ✅ States visibilité mots de passe
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
 
  // ✅ Fonction d'inscription
  const handleRegister = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.replace(/\s/g, "");

    if (!nom.trim() || !normalizedEmail || !normalizedPhone || !motdepasse || !confirmMotdepasse) {
      Alert.alert("Erreur", "Remplissez tous les champs obligatoires");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Email invalide");
      return;
    }

    if (!/^(\+237)?6[0-9]{8}$/.test(normalizedPhone)) {
      setError("Numéro camerounais invalide. Exemple: +2376xxxxxxxx ou 6xxxxxxxx");
      return;
    }
 
    if (motdepasse !== confirmMotdepasse) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
 
    if (motdepasse.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
 
    try {
      setLoading(true);
      setError("");
 
      await authService.register({
        nom: nom.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        motdepasse,
        confirm_motdepasse: confirmMotdepasse,
      });
 
      Alert.alert("Succès", "Compte créé avec succès !");
      router.replace("/(tabs)/Home/home");

    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((item) => item?.msg).filter(Boolean).join("\n")
        : detail || "Erreur lors de la création du compte";
      setError(message);
      Alert.alert("Erreur", message);
    } finally {
      setLoading(false);
    }
  };

  return (

    <View style={styles.container}>

      <Ellipse />

      <View style={styles.formContent}>
        <Text style={styles.title}>{t("auth.register_title")}</Text>

        <View style={styles.card}>

  {/* ── Nom ── */}
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={18} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder={t("auth.name")}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoComplete="name"
              textContentType="name"
              value={nom}
              onChangeText={setNom}
              style={styles.inputWithIcon}
            />
          </View>
 
  {/* ── Email ── */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={18} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder={t("auth.email")}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={styles.inputWithIcon}
            />
          </View>
 

  {/* ── Téléphone ── */}
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={18} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder={t("auth.phone")}
              placeholderTextColor={theme.textMuted}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoComplete="tel"
              textContentType="telephoneNumber"
              value={phone}
              onChangeText={setPhone}
              style={styles.inputWithIcon}
            />
          </View>

         {/* ── Mot de passe ── */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={18} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder={t("auth.password")}
              placeholderTextColor={theme.textMuted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              value={motdepasse}
              onChangeText={setMotdepasse}
              style={styles.inputWithIcon}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* ── Confirmer mot de passe ── */}
          <View style={styles.inputContainer}>
            <Ionicons name="shield-checkmark-outline" size={18} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              placeholder={t("auth.repeat_password")}
              placeholderTextColor={theme.textMuted}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              value={confirmMotdepasse}
              onChangeText={setConfirmMotdepasse}
              style={styles.inputWithIcon}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              activeOpacity={0.7}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>
 
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        
         {/* Lien connexion */}
          <TouchableOpacity onPress={() => router.push("/(tabs)/Authentification/Connexion")}>
            <Text style={styles.text}>
              {t("auth.already_account")} <Text style={styles.link}>{t("auth.sign_in")}</Text>
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t("auth.create_account")}</Text>
            )}
          </TouchableOpacity>

            {/* ── Divider ── */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Continuer avec</Text>
            <View style={styles.dividerLine} />
          </View>

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
  errorText: {
      color: "red",
      fontSize: 13,
      marginBottom: 10,
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
  eyeButton: {
  position: "absolute",  // ✅ positionné absolument à droite
  right: 12,
  height: "100%",
  justifyContent: "center",
},
 inputIcon: {
      marginRight: 8,
    },
    inputWithIcon: {
      flex: 1,
      color: theme.textPrimary,
      fontSize: 14,
      paddingVertical: 10,
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
  inputContainer: {
  flexDirection: "row",
  alignItems: "center",
  position: "relative",  // ✅ nécessaire pour le positionnement absolu
  backgroundColor: theme.bg,
  borderWidth: 1,
  borderColor: theme.border,
  borderRadius: 25,
  paddingHorizontal: 12,
  marginBottom: 12,
  minHeight: 48,
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
});
