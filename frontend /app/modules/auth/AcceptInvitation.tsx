import { Ionicons } from "@expo/vector-icons";
import { invitationService } from "@/services/invitationService";
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

export default function AcceptInvitationScreen() {
  const router = useRouter();
  const { token: paramToken } = useLocalSearchParams<{ token: string }>();

  const [token, setToken] = useState(paramToken ?? "");
  const [nom, setNom] = useState("");
  const [motdepasse, setMotdepasse] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!token.trim()) {
      Alert.alert("Erreur", "Le jeton d'invitation (token) est obligatoire.");
      return;
    }

    try {
      setLoading(true);
      const res = await invitationService.acceptInvitation(
        token.trim(),
        nom.trim() || undefined,
        motdepasse.trim() || undefined
      );

      Alert.alert(
        "Félicitations !",
        "Vous avez rejoint le projet avec succès.",
        [
          {
            text: "Se connecter",
            onPress: () => router.replace("/(tabs)/Authentification/Connexion"),
          },
        ]
      );
    } catch (err: any) {
      const message =
        err?.response?.data?.detail || "Erreur lors de l'acceptation de l'invitation.";
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
        {/* Logo/Icon */}
        <View style={s.iconSection}>
          <View style={s.iconOuter}>
            <View style={s.iconInner}>
              <Ionicons name="mail-open-outline" size={52} color="#3d8ef8" />
            </View>
          </View>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.title}>Rejoindre le projet</Text>
          <Text style={s.subtitle}>
            Saisissez vos informations pour accepter l'invitation et commencer à collaborer.
          </Text>

          {/* Token */}
          <Text style={s.label}>Jeton d'invitation (Token)</Text>
          <TextInput
            style={s.input}
            value={token}
            onChangeText={setToken}
            placeholder="Entrez ou collez le token d'invitation"
            placeholderTextColor="#8696a0"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Nom */}
          <Text style={s.label}>Nom complet (optionnel)</Text>
          <TextInput
            style={s.input}
            value={nom}
            onChangeText={setNom}
            placeholder="Ex: Jean Dupont"
            placeholderTextColor="#8696a0"
            autoCorrect={false}
          />

          {/* Mot de passe (requis si nouveau compte) */}
          <Text style={s.label}>Mot de passe (requis si nouveau compte)</Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.inputFlex}
              value={motdepasse}
              onChangeText={setMotdepasse}
              placeholder="Min. 8 caractères"
              placeholderTextColor="#8696a0"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={22}
                color="#3d8ef8"
              />
            </TouchableOpacity>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.8 }]}
            onPress={handleAccept}
            activeOpacity={0.88}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnText}>Rejoindre le projet</Text>
            )}
          </TouchableOpacity>

          {/* Return link */}
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
