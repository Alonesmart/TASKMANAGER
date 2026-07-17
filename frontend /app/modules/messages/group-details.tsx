import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAppTheme } from "@/theme";
import { userService, type User } from "@/services/userService";
import { conversationService } from "@/services/conversationService";
import { documentService } from "@/services/documentService";

export default function GroupDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useAppTheme();
  
  const [conversation, setConversation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  
  // Edit state
  const [editName, setEditName] = useState("");
  const [editAvatarUri, setEditAvatarUri] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Add member state
  const [contacts, setContacts] = useState<User[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);

  const fetchGroupDetails = useCallback(async () => {
    try {
      const conv = await conversationService.getConversation(parseInt(id));
      setConversation(conv);
      setEditName(conv.nom || "");
      setEditAvatarUri(conv.avatar || null);
    } catch (e) {
      console.error("Error fetching group details:", e);
      Alert.alert("Erreur", "Impossible de charger les details du groupe.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const init = async () => {
      try {
        const u = await userService.getCurrentUser();
        setCurrentUserId(u.id);
      } catch (e) {
        console.error("Error fetching current user:", e);
      }
      fetchGroupDetails();
    };
    init();
  }, [fetchGroupDetails]);

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;
      setEditAvatarUri(result.assets[0].uri);
    } catch (error) {
      console.error("Error picking avatar:", error);
      Alert.alert("Erreur", "Impossible de selectionner l'image.");
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      Alert.alert("Erreur", "Le nom du groupe ne peut pas etre vide.");
      return;
    }
    setSavingEdit(true);
    try {
      let avatarUrl = editAvatarUri;
      
      // Si l'image de profil a ete changee et est locale (commence par 'file://' ou 'content://')
      if (editAvatarUri && (editAvatarUri.startsWith("file://") || editAvatarUri.startsWith("content://"))) {
        const fileName = `group-avatar-${Date.now()}.jpg`;
        const mimeType = "image/jpeg";
        const uploadedDoc = await documentService.uploadDocument(
          editAvatarUri,
          fileName,
          mimeType
        );
        avatarUrl = documentService.getDownloadUrl(uploadedDoc.id);
      }

      const updated = await conversationService.createConversation({
        ...conversation,
        nom: editName.trim(),
        avatar: avatarUrl
      });
      setConversation(updated);
      setEditModalVisible(false);
      Alert.alert("Succes", "Informations du groupe mises a jour.");
    } catch (e) {
      console.error("Error updating group info:", e);
      Alert.alert("Erreur", "Impossible de mettre a jour les informations.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenAddModal = async () => {
    setAddModalVisible(true);
    setLoadingContacts(true);
    try {
      const users = await userService.getUsers();
      // Filtrer les contacts pour exclure ceux qui sont deja participants
      const participantIds = new Set(conversation.participants.map((p: any) => p.id_utilisateur));
      const filtered = users.filter((u: User) => !participantIds.has(u.id));
      setContacts(filtered);
    } catch (e) {
      console.error("Error loading contacts:", e);
    } finally {
      setLoadingContacts(false);
    }
  };

  const toggleSelectContact = (user: User) => {
    setSelectedContacts((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const handleAddMembers = async () => {
    if (selectedContacts.length === 0) return;
    setAddingMembers(true);
    try {
      // @ts-ignore
      const res = await conversationService.createConversation({
        ...conversation,
        participant_ids: [
          ...conversation.participants.map((p: any) => p.id_utilisateur),
          ...selectedContacts.map((u) => u.id)
        ]
      });
      setConversation(res);
      setAddModalVisible(false);
      setSelectedContacts([]);
      Alert.alert("Succes", "Membres ajoutes avec succes.");
    } catch (e) {
      console.error("Error adding group members:", e);
      Alert.alert("Erreur", "Impossible d'ajouter ces membres.");
    } finally {
      setAddingMembers(false);
    }
  };

  const handleRemoveMember = async (userId: number, userName: string) => {
    Alert.alert(
      "Confirmation",
      `Voulez-vous retirer ${userName} du groupe ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Retirer",
          style: "destructive",
          onPress: async () => {
            try {
              // @ts-ignore
              const res = await conversationService.createConversation({
                ...conversation,
                participant_ids: conversation.participants
                  .map((p: any) => p.id_utilisateur)
                  .filter((id: number) => id !== userId)
              });
              setConversation(res);
              Alert.alert("Succes", "Membre retire.");
            } catch (e) {
              console.error("Error removing member:", e);
              Alert.alert("Erreur", "Impossible de retirer ce membre.");
            }
          }
        }
      ]
    );
  };

  const handleChangeAdmin = async (userId: number, userName: string) => {
    Alert.alert(
      "Confirmation",
      `Voulez-vous designer ${userName} comme nouvel administrateur du groupe ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Designer",
          onPress: async () => {
            try {
              // @ts-ignore
              const res = await conversationService.createConversation({
                ...conversation,
                id_admin: userId
              });
              setConversation(res);
              Alert.alert("Succes", `${userName} est le nouvel administrateur.`);
            } catch (e) {
              console.error("Error changing admin:", e);
              Alert.alert("Erreur", "Impossible de changer l'administrateur.");
            }
          }
        }
      ]
    );
  };

  const handleLeaveGroup = async () => {
    Alert.alert(
      "Confirmation",
      "Voulez-vous vraiment quitter ce groupe ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Quitter",
          style: "destructive",
          onPress: async () => {
            try {
              // @ts-ignore
              await conversationService.createConversation({
                ...conversation,
                participant_ids: conversation.participants
                  .map((p: any) => p.id_utilisateur)
                  .filter((id: number) => id !== currentUserId)
              });
              Alert.alert("Succes", "Vous avez quitte le groupe.");
              router.dismissTo("/(tabs)/Home/messages");
            } catch (e) {
              console.error("Error leaving group:", e);
              Alert.alert("Erreur", "Impossible de quitter le groupe.");
            }
          }
        }
      ]
    );
  };

  const isAdmin = currentUserId === conversation?.id_admin;
  const filteredContacts = contacts.filter((c) =>
    c.nom.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || !conversation) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg, justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </SafeAreaView>
    );
  }

  const initials = conversation.nom
    ? conversation.nom.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "GP";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.cardBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Details du groupe</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={conversation.participants}
        keyExtractor={(item) => item.id_utilisateur.toString()}
        ListHeaderComponent={
          <View style={styles.topSection}>
            {/* Group Identity Card */}
            <View style={[styles.identityCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              {conversation.avatar ? (
                <Image source={{ uri: conversation.avatar }} style={styles.largeAvatar} />
              ) : (
                <View style={[styles.largeAvatarPlaceholder, { backgroundColor: theme.bg }]}>
                  <Text style={[styles.largeAvatarText, { color: theme.accent }]}>{initials}</Text>
                </View>
              )}
              <Text style={[styles.groupTitle, { color: theme.textPrimary }]}>{conversation.nom}</Text>
              
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => setEditModalVisible(true)}
                  style={[styles.editButton, { backgroundColor: theme.bg, borderColor: theme.border }]}
                >
                  <Ionicons name="pencil" size={16} color={theme.accent} style={{ marginRight: 6 }} />
                  <Text style={[styles.editButtonText, { color: theme.textPrimary }]}>Modifier</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Actions Bar */}
            <View style={[styles.actionsBar, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Membres du groupe</Text>
              {isAdmin && (
                <TouchableOpacity
                  onPress={handleOpenAddModal}
                  style={[styles.actionIconButton, { backgroundColor: theme.accentSoft }]}
                >
                  <Ionicons name="person-add" size={18} color={theme.accent} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const uInitials = item.utilisateur.nom.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
          const isUserAdmin = item.id_utilisateur === conversation.id_admin;
          const isMe = item.id_utilisateur === currentUserId;
          
          return (
            <View style={[styles.participantRow, { borderBottomColor: theme.border, backgroundColor: theme.cardBg }]}>
              <View style={[styles.rowAvatar, { backgroundColor: theme.bg }]}>
                <Text style={[styles.rowAvatarText, { color: theme.accent }]}>{uInitials}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowName, { color: theme.textPrimary }]}>
                  {item.utilisateur.nom} {isMe ? "(Vous)" : ""}
                </Text>
                <Text style={[styles.rowRole, { color: theme.textSecondary }]}>
                  {item.utilisateur.role}
                </Text>
              </View>
              
              {isUserAdmin && (
                <View style={[styles.adminBadge, { backgroundColor: theme.accentSoft }]}>
                  <Text style={[styles.adminBadgeText, { color: theme.accent }]}>Admin</Text>
                </View>
              )}

              {isAdmin && !isMe && (
                <View style={styles.manageButtons}>
                  <TouchableOpacity
                    onPress={() => handleChangeAdmin(item.id_utilisateur, item.utilisateur.nom)}
                    style={styles.manageBtn}
                    title="Nommer Admin"
                  >
                    <Ionicons name="key" size={18} color={theme.warning} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRemoveMember(item.id_utilisateur, item.utilisateur.nom)}
                    style={styles.manageBtn}
                  >
                    <Ionicons name="trash" size={18} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        ListFooterComponent={
          <View style={styles.footerSection}>
            <TouchableOpacity
              onPress={handleLeaveGroup}
              style={[styles.leaveButton, { backgroundColor: theme.cardBg, borderColor: theme.danger }]}
            >
              <Ionicons name="log-out" size={20} color={theme.danger} style={{ marginRight: 8 }} />
              <Text style={[styles.leaveButtonText, { color: theme.danger }]}>Quitter le groupe</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Edit Group Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Modifier le groupe</Text>
            
            <TouchableOpacity onPress={handlePickAvatar} style={styles.modalAvatarPicker}>
              {editAvatarUri ? (
                <Image source={{ uri: editAvatarUri }} style={styles.modalAvatarImage} />
              ) : (
                <View style={[styles.modalAvatarPlaceholder, { backgroundColor: theme.bg }]}>
                  <Ionicons name="camera" size={36} color={theme.textSecondary} />
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Nom du groupe"
              placeholderTextColor={theme.textSecondary}
              style={[styles.modalInput, { color: theme.textPrimary, borderBottomColor: theme.border }]}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={[styles.modalBtn, { borderColor: theme.border }]}
              >
                <Text style={[styles.modalBtnText, { color: theme.textSecondary }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={savingEdit}
                style={[styles.modalBtn, { backgroundColor: theme.accent, borderColor: theme.accent }]}
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Members Modal */}
      <Modal visible={addModalVisible} animationType="slide">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.bg }]}>
          <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.cardBg }]}>
            <TouchableOpacity onPress={() => setAddModalVisible(false)} style={styles.backButton}>
              <Ionicons name="close" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Ajouter des membres</Text>
            <TouchableOpacity
              onPress={handleAddMembers}
              disabled={addingMembers || selectedContacts.length === 0}
              style={[
                styles.createButton,
                { backgroundColor: selectedContacts.length === 0 ? theme.border : theme.accent }
              ]}
            >
              {addingMembers ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>Ajouter</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={[styles.searchContainer, { backgroundColor: theme.bg }]}>
            <View style={[styles.searchBar, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <Ionicons name="search" size={20} color={theme.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Rechercher des contacts"
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[styles.searchInput, { color: theme.textPrimary }]}
              />
            </View>
          </View>

          {loadingContacts ? (
            <ActivityIndicator size="large" color={theme.accent} style={{ flex: 1 }} />
          ) : (
            <FlatList
              data={filteredContacts}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const isSelected = selectedContacts.some((u) => u.id === item.id);
                const cInitials = item.nom.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <TouchableOpacity
                    onPress={() => toggleSelectContact(item)}
                    style={[styles.contactItem, { borderBottomColor: theme.border, backgroundColor: theme.cardBg }]}
                  >
                    <View style={[styles.contactAvatar, { backgroundColor: theme.accentSoft }]}>
                      <Text style={[styles.contactAvatarText, { color: theme.accent }]}>{cInitials}</Text>
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
      </Modal>
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
  topSection: { padding: 16 },
  identityCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  largeAvatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  largeAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
  },
  largeAvatarText: { fontSize: 32, fontWeight: "bold" },
  groupTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 12, textAlign: "center" },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  editButtonText: { fontSize: 13, fontWeight: "600" },
  actionsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold" },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowAvatarText: { fontWeight: "bold", fontSize: 14 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: "bold" },
  rowRole: { fontSize: 12, marginTop: 2 },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  adminBadgeText: { fontSize: 11, fontWeight: "bold" },
  manageButtons: { flexDirection: "row", alignItems: "center", gap: 10 },
  manageBtn: { padding: 4 },
  footerSection: { padding: 16, marginTop: 10, marginBottom: 40 },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  leaveButtonText: { fontWeight: "bold", fontSize: 15 },
  
  // Modal Edit Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 20 },
  modalAvatarPicker: { marginBottom: 20 },
  modalAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatarImage: { width: 80, height: 80, borderRadius: 40 },
  modalInput: {
    width: "100%",
    fontSize: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    marginBottom: 24,
    textAlign: "center",
  },
  modalActions: { flexDirection: "row", width: "100%", gap: 12 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  modalBtnText: { fontWeight: "bold", fontSize: 14 },
  
  // Modal Add Styles
  modalContainer: { flex: 1 },
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
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
