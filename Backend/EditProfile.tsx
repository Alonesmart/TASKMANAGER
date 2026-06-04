import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useAppTheme } from "@/theme";
import { API_URL } from "@/constants/API_URL";
import { getStorageItem } from "@/utils/storage";

export default function EditProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [nom, setNom] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = await getStorageItem("access_token");
      const response = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNom(response.data.nom);
      setPhone(response.data.phone);
    } catch (error) {
      Alert.alert("Erreur", "Impossible de charger le profil");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!nom.trim()) {
      Alert.alert("Erreur", t("new_project.project_name_required")); // Réutilisation ou clé spécifique
      return;
    }

    try {
      setSaving(true);
      const token = await getStorageItem("access_token");
      await axios.put(
        `${API_URL}/users/me`,
        { nom: nom.trim(), phone: phone.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Succès", "Profil mis à jour !");
      router.back();
    } catch (error) {
      Alert.alert("Erreur", "La mise à jour a échoué");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>{t("edit_profile.full_name")}</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color={theme.textSecondary} />
        <TextInput
          style={styles.input}
          value={nom}
          onChangeText={setNom}
          placeholderTextColor={theme.textMuted}
        />
      </View>

      <Text style={styles.label}>{t("auth.phone")}</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="call-outline" size={20} color={theme.textSecondary} />
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholderTextColor={theme.textMuted}
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && { opacity: 0.7 }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>{t("common.save")}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 20 },
    label: {
      color: theme.textPrimary,
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 8,
      marginTop: 15,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.cardBg,
      borderRadius: 12,
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: theme.border,
    },
    input: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 10,
      color: theme.textPrimary,
    },
    saveButton: {
      backgroundColor: theme.accent,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 30,
    },
    saveButtonText: {
      color: "#fff",
      fontWeight: "bold",
      fontSize: 16,
    },
  });
