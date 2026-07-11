import { Ionicons } from "@expo/vector-icons";
import { authService } from "@/services/authService";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert("Erreur", "Veuillez entrer votre adresse e-mail.");
      return;
    }
 
    try {
      setLoading(true);
 
      const response = await authService.forgotPassword(email);
 
    // ✅ Le backend renvoie le reset_token en mode dev
      const resetToken = response?.reset_token ?? undefined;
 
      Alert.alert(
        "Email envoyé",
        `Un lien de réinitialisation a été envoyé à ${email.trim()}.\n\nVous avez 30 minutes pour l'utiliser.`,
        [
          {
            text: "Continuer",
            onPress: () =>
              // ✅ Navigation vers l'écran de reset avec l'email pré-rempli
              // et le token si disponible (mode dev)
              router.push({
                pathname: "/(tabs)/Authentification/ResetPassword",
                params: {
                  email: email.trim(),
                  // En prod le token arrive par email, en dev on le passe directement
                  token: resetToken ?? "",
                },
              }),
          },
        ]
      );
    } catch (err: any) {
      const message =
        err?.response?.data?.detail || "Impossible d'envoyer le lien. Réessayez.";
      Alert.alert("Erreur", message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1b3e" />

      {/* ── Fond dégradé sombre ── */}
      <LinearGradient
        colors={["#0d1b3e", "#0f2050", "#0d1b3e"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Orbe haut gauche ── */}
      <View style={s.orbTopLeft} />

      
      <SafeAreaView style={s.safe}>

        {/* ── Icône enveloppe ── */}
        <View style={s.iconSection}>
          <View style={s.iconOuter}>
            <View style={s.iconInner}>
              <Ionicons name="mail-outline" size={56} color="#3d8ef8" />
            </View>
          </View>
        </View>

        {/* ── Card ── */}
        <View style={s.card}>

          {/* Titre */}
          <Text style={s.title}>Mot de passe oublié ?</Text>
          <Text style={s.subtitle}>
            Entrez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </Text>

          {/* Label + Input */}
          <Text style={s.label}>Adresse e-mail</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder=""
            placeholderTextColor="#8696a0"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />

          {/* Bouton envoyer */}
          <TouchableOpacity
            style={[s.sendBtn, loading && { opacity: 0.8 }]}
            onPress={handleSend}
            activeOpacity={0.88}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.sendBtnText}>Envoyer le lien de réinitialisation</Text>
            )}
          </TouchableOpacity>

          {/* Retour connexion */}
          <TouchableOpacity
            style={s.backRow}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color="#3d8ef8" />
            <Text style={s.backText}>Retour à la connexion</Text>
          </TouchableOpacity>
        </View>

        {/* ── Lien support bas de page ── */}
        <View style={s.supportRow}>
          <Text style={s.supportText}>Besoin d&apos;aide ? </Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={s.supportLink}>Contactez le support</Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD_BG   = "#0f1e3a";
const ACCENT    = "#3d8ef8";
const TEXT      = "#ffffff";
const TEXT_SUB  = "#a0b4cc";
const INPUT_BG  = "#d0dce8";
const SEND_BG   = "#2979f5";

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0d1b3e" },
  safe: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Orbes
  orbTopLeft: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: 400,
    backgroundColor: "#1a3a7a",
    top: -140,
    left: -120,
    opacity: 0.7,
  },
  orbTopRight: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#1a3a7a",
    top: -60,
    right: -80,
    opacity: 0.5,
  },

  // Icône
  iconSection: {
    alignItems: "center",
    marginBottom: -46,
    zIndex: 10,
  },
  iconOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#1a3060",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#1e3870",
  },
  iconInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#1a3060",
    alignItems: "center",
    justifyContent: "center",
  },

  // Card
  card: {
    width: width * 0.88,
    backgroundColor: CARD_BG,
    borderRadius: 28,
    paddingHorizontal: 26,
    paddingTop: 66,
    paddingBottom: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 14,
  },

  title: {
    color: TEXT,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: TEXT_SUB,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 28,
  },

  label: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "600",
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: "#0d1b3e",
    marginBottom: 18,
  },

  sendBtn: {
    width: "100%",
    backgroundColor: SEND_BG,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 18,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  sendBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  backText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: "600",
  },

  // Support
  supportRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 36,
  },
  supportText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "600",
  },
  supportLink: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: "600",
  },
});
