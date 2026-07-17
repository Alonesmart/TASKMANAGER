import React, { useMemo, useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAppTheme } from "@/theme";
import { userService, type User } from "@/services/userService";
import { conversationService } from "@/services/conversationService";
import { documentService } from "@/services/documentService";

export default function NewGroupScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [groupName, setGroupName] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [contacts, setContacts] = useState<User[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingContacts(true);
        const users = await userService.getUsers();
        setContacts(users);
      } catch (error) {
        console.error("Failed to fetch users:", error);
        Alert.alert("Erreur", "Impossible de charger la liste des contacts.");
      } finally {
        setLoadingContacts(false);
      }
    };
    fetchUsers();
  }, []);

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;
      setAvatarUri(result.assets[0].uri);
    } catch (error) {
      console.error("Error picking avatar:", error);
      Alert.alert("Erreur", "Impossible de selectionner l'image.");
    }
  };

  const toggleSelectContact = (user: User) => {
    setSelectedContacts((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Erreur", "Veuillez entrer un nom pour le groupe.");
      return;
    }
    if (selectedContacts.length === 0) {
      Alert.alert("Erreur", "Veuillez selectionner au moins un participant.");
      return;
    }

    setCreating(true);
    try {
      let avatarUrl = "";
      if (avatarUri) {
        setAvatarUploading(true);
        const fileName = `group-avatar-${Date.now()}.jpg`;
        const mimeType = "image/jpeg";
        const uploadedDoc = await documentService.uploadDocument(
          avatarUri,
          fileName,
          mimeType
        );
        avatarUrl = documentService.getDownloadUrl(uploadedDoc.id);
        setAvatarUploading(false);
      }

      const participantIds = selectedContacts.map((u) => u.id);
      
      const conv = await conversationService.createConversation({
        nom: groupName.trim(),
        type: "groupe",
        participant_ids: participantIds,
      });

      // Si l'avatar a ete charge, on met a jour la conversation pour le stocker
      if (avatarUrl) {
        // Optionnel : appeler un PUT sur conversation pour enregistrer l'avatar
        // Notre backend supporte la modification de groupe (modifier_groupe)
        try {
          await conversationService.createConversation({
            ...conv,
            // @ts-ignore
            avatar: avatarUrl
          });
        } catch (e) {
          console.error("Failed to update group avatar:", e);
        }
      }

      Alert.alert("Succes", "Groupe cree avec succes.");
      router.replace({
        pathname: "/(tabs)/Home/conversation",
        params: { id: conv.id_conversation.toString(), name: conv.nom || groupName },
      });
    } catch (error) {
      console.error("Failed to create group:", error);
      Alert.alert("Erreur", "Impossible de creer le groupe.");
    } finally {
      setCreating(false);
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.nom.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.cardBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Nouveau groupe</Text>
        <TouchableOpacity
          onPress={handleCreateGroup}
          disabled={creating || !groupName.trim() || selectedContacts.length === 0}
          style={[
            styles.createButton,
            {
              backgroundColor:
                !groupName.trim() || selectedContacts.length === 0 ? theme.border : theme.accent,
            },
          ]}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Creer</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Group Info (Name & Avatar) */}
      <View style={[styles.groupInfoContainer, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarPicker}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.bg }]}>
              <Ionicons name="camera" size={30} color={theme.textSecondary} />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Nom du groupe"
            placeholderTextColor={theme.textSecondary}
            value={groupName}
            onChangeText={setGroupName}
            style={[styles.nameInput, { color: theme.textPrimary, borderBottomColor: theme.border }]}
          />
          <Text style={[styles.participantCount, { color: theme.textSecondary }]}>
            {selectedContacts.length} participant(s) selectionne(s)
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.bg }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Rechercher des participants"
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.textPrimary }]}
          />
        </View>
      </View>

      {/* Selected Members ScrollView */}
      {selectedContacts.length > 0 && (
        <View style={[styles.selectedListContainer, { borderBottomColor: theme.border }]}>
          <FlatList
            horizontal
            data={selectedContacts}
            keyExtractor={(item) => item.id.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            renderItem={({ item }) => {
              const initials = item.nom.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
              return (
                <View style={styles.selectedUserChip}>
                  <View style={[styles.chipAvatar, { backgroundColor: theme.accentSoft }]}>
                    <Text style={[styles.chipAvatarText, { color: theme.accent }]}>{initials}</Text>
                    <TouchableOpacity
                      onPress={() => toggleSelectContact(item)}
                      style={[styles.removeChipButton, { backgroundColor: theme.textSecondary }]}
                    >
                      <Ionicons name="close" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <Text numberOfLines={1} style={[styles.chipName, { color: theme.textPrimary }]}>
                    {item.nom.split(" ")[0]}
                  </Text>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* Contact List */}
      {loadingContacts ? (
        <ActivityIndicator size="large" color={theme.accent} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => {
            const isSelected = selectedContacts.some((u) => u.id === item.id);
            const initials = item.nom.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
            return (
              <TouchableOpacity
                onPress={() => toggleSelectContact(item)}
                style={[styles.contactItem, { borderBottomColor: theme.border }]}
              >
                <View style={[styles.contactAvatar, { backgroundColor: theme.accentSoft }]}>
                  <Text style={[styles.contactAvatarText, { color: theme.accent }]}>{initials}</Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={[styles.contactName, { color: theme.textPrimary }]}>{item.nom}</Text>
                  <Text style={[styles.contactRole, { color: theme.textSecondary }]}>{item.role}</Text>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    { borderColor: isSelected ? theme.accent : theme.border },
                    isSelected && { backgroundColor: theme.accent },
                  ]}
                >
                  {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: "center",
  },
  createButtonText: { color: "#fff", fontWeight: "bold" },
  groupInfoContainer: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  avatarPicker: { marginRight: 16 },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  inputContainer: { flex: 1 },
  nameInput: {
    fontSize: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  participantCount: { fontSize: 12 },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },
  selectedListContainer: { paddingVertical: 12, borderBottomWidth: 1 },
  selectedUserChip: { alignItems: "center", width: 60 },
  chipAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  chipAvatarText: { fontWeight: "bold", fontSize: 14 },
  removeChipButton: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  chipName: { fontSize: 10, marginTop: 4, textAlign: "center", width: "100%" },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contactAvatarText: { fontWeight: "bold", fontSize: 14 },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15, fontWeight: "bold" },
  contactRole: { fontSize: 12, marginTop: 2 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
