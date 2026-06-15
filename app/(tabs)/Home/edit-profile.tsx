import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/theme";
import { userService } from "@/services/userService";

export default function EditProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const user = await userService.getCurrentUser();
      setNom(user.nom);
      setEmail(user.email);
      setRole(user.role);
      setPhone(user.phone || "");
    } catch (error) {
      console.error("Error fetching user for edit:", error);
      Alert.alert(t("common.error"), t("edit_profile.fetch_error") || "Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!nom.trim()) {
      Alert.alert(t("common.error"), t("edit_profile.name_required") || "Le nom est requis");
      return;
    }

    setSaving(true);
    try {
      await userService.updateUserMe({ nom: nom.trim(), phone: phone.trim() });
      Alert.alert(t("common.success"), t("edit_profile.save_success") || "Profil mis à jour avec succès");
      router.back();
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert(t("common.error"), t("edit_profile.save_error") || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{t("edit_profile.title")}</Text>
          <View style={styles.spacer} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t("edit_profile.full_name")}</Text>
          <TextInput 
            style={styles.input} 
            value={nom} 
            onChangeText={setNom}
            placeholderTextColor="#7d8590" 
          />

          <Text style={styles.label}>{t("edit_profile.phone") || "Téléphone"}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor="#7d8590"
          />

          <Text style={styles.label}>{t("edit_profile.email")}</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={email}
            editable={false}
            placeholderTextColor="#7d8590"
          />

          <Text style={styles.label}>{t("edit_profile.role")}</Text>
          <TextInput 
            style={[styles.input, styles.disabledInput]} 
            value={role.toUpperCase()} 
            editable={false}
            placeholderTextColor="#7d8590" 
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveText}>{t("common.save")}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  },
  scroll: {
    padding: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  spacer: {
    width: 40,
    height: 40,
  },
  card: {
    backgroundColor: theme.cardBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  label: {
    color: theme.textSecondary,
    marginBottom: 6,
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
  },
  input: {
    backgroundColor: theme.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  disabledInput: {
    opacity: 0.6,
    backgroundColor: theme.cardBg,
  },
  saveBtn: {
    marginTop: 24,
    backgroundColor: theme.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  saveText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
