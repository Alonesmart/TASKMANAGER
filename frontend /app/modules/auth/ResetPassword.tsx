import { Ionicons } from "@expo/vector-icons";
import { authService } from "@/services/authService";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
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

export default function ResetPasswordScreen() {
  const router = useRouter();
  // ✅ Récupère le token et l'email passés depuis ForgotPassword
  const { token: paramToken, email } = useLocalSearchParams<{
    token: string;
    email: string;
  }>();

  const [token, setToken] = useState(paramToken ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!token.trim()) {
      Alert.alert("Erreur", "Veuillez entrer votre code de réinitialisation.");
      return;
    }
    if (!newPassword || !confirmPassword) {
      Alert.alert("Erreur", "Remplissez tous les champs.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    try {
      setLoading(true);
      await authService.resetPassword(token, newPassword, confirmPassword);

      Alert.alert(
        "Succès",
        "Votre mot de passe a été réinitialisé avec succès !",
        [
          {
            text: "Se connecter",
            onPress: () =>
              router.replace("/(tabs)/Authentification/Connexion"),
          },
        ]
      );
    } catch (err: any) {
      const message =
        err?.response?.data?.detail || "Erreur lors de la réinitialisation.";
      Alert.alert("Erreur", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1b3e" />

      <LinearGradient
        colors={["#0d1b3e", "#0f2050", "#0d1b3e"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.orbTopLeft} />

      <SafeAreaView style={s.safe}>

        {/* Icône cadenas */}
        <View style={s.iconSection}>
          <View style={s.iconOuter}>
            <View style={s.iconInner}>
              <Ionicons name="lock-open-outline" size={52} color="#3d8ef8" />
            </View>
          </View>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.title}>Nouveau mot de passe</Text>
          {email ? (
            <Text style={s.subtitle}>
              Réinitialisation pour{" "}
              <Text style={{ color: "#3d8ef8" }}>{email}</Text>
            </Text>
          ) : (
            <Text style={s.subtitle}>
              Entrez le code reçu par email et choisissez un nouveau mot de passe.
            </Text>
          )}

          {/* Code de réinitialisation — pré-rempli en mode dev */}
          <Text style={s.label}>Code de réinitialisation</Text>
          <TextInput
            style={s.input}
            value={token}
            onChangeText={setToken}
            placeholder="Collez le code reçu par email"
            placeholderTextColor="#8696a0"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Nouveau mot de passe */}
          <Text style={s.label}>Nouveau mot de passe</Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.inputFlex}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Au moins 8 caractères"
              placeholderTextColor="#8696a0"
              secureTextEntry={!showNew}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowNew(!showNew)} activeOpacity={0.7}>
              <Ionicons
                name={showNew ? "eye-outline" : "eye-off-outline"}
                size={22}
                color="#3d8ef8"
              />
            </TouchableOpacity>
          </View>

          {/* Confirmer mot de passe */}
          <Text style={s.label}>Confirmer le mot de passe</Text>
          <View style={[s.inputRow, { marginBottom: 22 }]}>
            <TextInput
              style={s.inputFlex}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Répétez le mot de passe"
              placeholderTextColor="#8696a0"
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowConfirm(!showConfirm)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showConfirm ? "eye-outline" : "eye-off-outline"}
                size={22}
                color="#3d8ef8"
              />
            </TouchableOpacity>
          </View>

          {/* Bouton valider */}
          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.8 }]}
            onPress={handleReset}
            activeOpacity={0.88}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnText}>Réinitialiser le mot de passe</Text>
            )}
          </TouchableOpacity>

          {/* Retour connexion */}
          <TouchableOpacity
            style={s.backRow}
            onPress={() => router.replace("/(tabs)/Authentification/Connexion")}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color="#3d8ef8" />
            <Text style={s.backText}>Retour à la connexion</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD_BG = "#0f1e3a";
const ACCENT  = "#3d8ef8";
const TEXT    = "#ffffff";
const TEXT_SUB = "#a0b4cc";
const INPUT_BG = "#d0dce8";

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0d1b3e" },
  safe: { flex: 1, alignItems: "center", justifyContent: "center" },

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
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: TEXT_SUB,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
  },

  label: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "600",
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: "#0d1b3e",
    marginBottom: 16,
  },
  inputRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 16,
  },
  inputFlex: {
    flex: 1,
    fontSize: 14,
    color: "#0d1b3e",
    paddingVertical: 9,
  },

  btn: {
    width: "100%",
    backgroundColor: "#2979f5",
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
  btnText: {
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
});
