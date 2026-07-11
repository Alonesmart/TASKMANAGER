import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Linking,
  ActivityIndicator,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/theme";
import { meetingService, type Meeting } from "@/services/meetingService";
import { projectService, type Project } from "@/services/projectService";
import { userService, type User } from "@/services/userService";

export default function VideoScreen() {
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { theme } = useAppTheme();

  // State
  const [meetings, setMeetings]         = useState<Meeting[]>([]);
  const [projects, setProjects]         = useState<Project[]>([]);
  const [users, setUsers]               = useState<User[]>([]);
  const [currentUser, setCurrentUser]   = useState<User | null>(null);
  const [loading, setLoading]           = useState(true);

  // Modals
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  
  const [createVisible, setCreateVisible]   = useState(false);
  const [newTitle, setNewTitle]             = useState("");
  const [newDateStr, setNewDateStr]         = useState(""); // Format: YYYY-MM-DD HH:MM
  const [newLink, setNewLink]               = useState("");
  const [newAgenda, setNewAgenda]           = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedUserIds, setSelectedUserIds]     = useState<number[]>([]);
  const [creating, setCreating]                   = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Current user
      const user = await userService.getCurrentUser();
      setCurrentUser(user);

      // Meetings
      const meets = await meetingService.getMeetings();
      setMeetings(meets);

      // Projects (only fetch projects if user is admin, or projects they are part of)
      const projs = await projectService.getProjects();
      setProjects(projs);

      // Users for invitations
      const allUsers = await userService.getUsers();
      setUsers(allUsers.filter((u) => u.id !== user?.id)); // Exclude current user from selection
    } catch (error) {
      console.error("Error fetching meetings screen data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchAllData();
    }
  }, [isFocused]);

  const handleOpenDetails = (meet: Meeting) => {
    setSelectedMeeting(meet);
    setDetailsVisible(true);
  };

  const handleJoinMeeting = (link: string | null) => {
    if (!link) {
      Alert.alert(t("common.error"), "Aucun lien de visioconférence fourni.");
      return;
    }
    Linking.openURL(link).catch((err) => {
      console.error("Failed to open meeting link:", err);
      Alert.alert(t("common.error"), "Impossible d'ouvrir le lien.");
    });
  };

  const handleRespond = async (meetId: number, status: "confirme" | "decline") => {
    try {
      await meetingService.respondInvitation(meetId, status);
      Alert.alert(t("common.success"), "Votre réponse a été enregistrée.");
      setDetailsVisible(false);
      fetchAllData();
    } catch (error) {
      console.error("Error responding to meeting invitation:", error);
      Alert.alert(t("common.error"), "Impossible d'enregistrer votre réponse.");
    }
  };

  const handleCreateMeeting = async () => {
    if (!newTitle.trim()) {
      Alert.alert(t("common.error"), "Le titre est requis.");
      return;
    }
    if (!newDateStr.trim()) {
      Alert.alert(t("common.error"), "La date et l'heure sont requises.");
      return;
    }
    if (!selectedProjectId) {
      Alert.alert(t("common.error"), "Le projet est requis.");
      return;
    }

    setCreating(true);
    try {
      // Validate date parsing
      const parsedDate = new Date(newDateStr);
      if (Number.isNaN(parsedDate.getTime())) {
        Alert.alert(t("common.error"), "Format de date invalide (Ex: YYYY-MM-DD HH:MM).");
        setCreating(false);
        return;
      }

      await meetingService.createMeeting({
        titre: newTitle,
        date: parsedDate.toISOString(),
        lien_virtuel: newLink || null,
        ordre_jour: newAgenda || null,
        id_projet: selectedProjectId,
        invited_user_ids: selectedUserIds,
      });

      Alert.alert(t("common.success"), "Réunion planifiée avec succès.");
      setCreateVisible(false);
      // Reset form
      setNewTitle("");
      setNewDateStr("");
      setNewLink("");
      setNewAgenda("");
      setSelectedProjectId(null);
      setSelectedUserIds([]);
      fetchAllData();
    } catch (error) {
      console.error("Error creating meeting:", error);
      Alert.alert(t("common.error"), "Impossible de planifier la réunion.");
    } finally {
      setCreating(false);
    }
  };

  const getParticipantStatusIcon = (status: string) => {
    switch (status) {
      case "confirme":
        return { name: "checkmark-circle", color: "#10b981", label: "Confirmé" };
      case "decline":
        return { name: "close-circle", color: "#ef4444", label: "Décliné" };
      default:
        return { name: "help-circle", color: "#f59e0b", label: "Invité" };
    }
  };

  const toggleUserInvitation = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Collaboration</Text>
          <Text style={styles.headerTitle}>{t("tabs.video")}</Text>
        </View>
      </View>

      {/* Meetings List */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : meetings.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="videocam-outline" size={40} color={theme.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>Aucune réunion</Text>
            <Text style={styles.emptySub}>Aucune réunion n'est planifiée à ce jour.</Text>
          </View>
        ) : (
          <ScrollView
            style={{ width: "100%", paddingHorizontal: 20 }}
            contentContainerStyle={{ gap: 12, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            {meetings.map((meet) => {
              const myInvitation = meet.invitations.find(
                (inv) => inv.id_utilisateur === currentUser?.id
              );
              const rsvp = getParticipantStatusIcon(myInvitation?.statut || "");

              return (
                <TouchableOpacity
                  key={meet.id_reunion}
                  style={[styles.meetingCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                  onPress={() => handleOpenDetails(meet)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons name="calendar-outline" size={16} color={theme.accent} />
                      <Text style={[styles.cardDate, { color: theme.textSecondary }]}>
                        {new Date(meet.date).toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: rsvp.color + "22", borderColor: rsvp.color }]}>
                      <Text style={[styles.statusBadgeText, { color: rsvp.color }]}>{rsvp.label}</Text>
                    </View>
                  </View>

                  <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{meet.titre}</Text>
                  
                  {!!meet.ordre_jour && (
                    <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                      {meet.ordre_jour}
                    </Text>
                  )}

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: theme.accent }]}
                      onPress={() => handleJoinMeeting(meet.lien_virtuel)}
                    >
                      <Ionicons name="videocam" size={14} color="#fff" />
                      <Text style={styles.actionBtnText}>Rejoindre</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Floating Add Button */}
      {isAdmin && (
        <TouchableOpacity
          style={[styles.floatingAddButton, { backgroundColor: theme.accent, shadowColor: theme.accent }]}
          onPress={() => setCreateVisible(true)}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ── Detail Modal ── */}
      <Modal
        visible={detailsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalEyebrow, { color: theme.textSecondary }]}>Détails de la réunion</Text>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]} numberOfLines={2}>
                  {selectedMeeting?.titre}
                </Text>
              </View>
              <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]} onPress={() => setDetailsVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedMeeting && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                <View style={styles.detailGrid}>
                  <View style={[styles.detailBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                    <Ionicons name="calendar-outline" size={16} color="#f5a623" />
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Date / Heure</Text>
                    <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
                      {new Date(selectedMeeting.date).toLocaleString()}
                    </Text>
                  </View>
                  <View style={[styles.detailBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                    <Ionicons name="link-outline" size={16} color={theme.accent} />
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Lien Virtuel</Text>
                    <Text 
                      style={[styles.detailValue, { color: theme.accent, textDecorationLine: "underline" }]}
                      numberOfLines={1}
                      onPress={() => handleJoinMeeting(selectedMeeting.lien_virtuel)}
                    >
                      {selectedMeeting.lien_virtuel || "Aucun"}
                    </Text>
                  </View>
                </View>

                {!!selectedMeeting.ordre_jour && (
                  <View style={[styles.detailSection, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Ordre du Jour</Text>
                    <Text style={[styles.sectionContent, { color: theme.textPrimary }]}>
                      {selectedMeeting.ordre_jour}
                    </Text>
                  </View>
                )}

                {/* RSVP / User responses */}
                <View style={[styles.detailSection, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Participants</Text>
                  {selectedMeeting.invitations.map((inv) => {
                    const rsvp = getParticipantStatusIcon(inv.statut);
                    return (
                      <View key={inv.id_utilisateur} style={styles.participantRow}>
                        <View style={[styles.avatar, { backgroundColor: theme.accent + "16", borderColor: theme.accent + "33" }]}>
                          <Text style={[styles.avatarText, { color: theme.accent }]}>
                            {inv.nom.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.participantName, { color: theme.textPrimary }]}>{inv.nom}</Text>
                          <Text style={[styles.participantEmail, { color: theme.textSecondary }]}>{inv.email}</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Ionicons name={rsvp.name as any} size={16} color={rsvp.color} />
                          <Text style={[styles.participantStatusText, { color: rsvp.color }]}>{rsvp.label}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* My invitation response action buttons */}
                {(() => {
                  const myInvitation = selectedMeeting.invitations.find(
                    (inv) => inv.id_utilisateur === currentUser?.id
                  );
                  if (myInvitation && myInvitation.statut === "invite") {
                    return (
                      <View style={styles.rsvpActionContainer}>
                        <Text style={[styles.rsvpTitle, { color: theme.textPrimary }]}>Invitation reçue</Text>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <TouchableOpacity
                            style={[styles.rsvpBtn, { backgroundColor: "#10b981" }]}
                            onPress={() => handleRespond(selectedMeeting.id_reunion, "confirme")}
                          >
                            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                            <Text style={styles.rsvpBtnText}>Accepter</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.rsvpBtn, { backgroundColor: "#ef4444" }]}
                            onPress={() => handleRespond(selectedMeeting.id_reunion, "decline")}
                          >
                            <Ionicons name="close-circle-outline" size={18} color="#fff" />
                            <Text style={styles.rsvpBtnText}>Décliner</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }
                  return null;
                })()}

                {/* Direct join btn */}
                <TouchableOpacity
                  style={[styles.joinLargeBtn, { backgroundColor: theme.accent }]}
                  onPress={() => handleJoinMeeting(selectedMeeting.lien_virtuel)}
                >
                  <Ionicons name="videocam" size={18} color="#fff" />
                  <Text style={styles.joinLargeBtnText}>Rejoindre la visioconférence</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Create Modal ── */}
      <Modal
        visible={createVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalEyebrow, { color: theme.textSecondary }]}>Planifier</Text>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Nouvelle réunion</Text>
              </View>
              <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]} onPress={() => setCreateVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              {/* Title */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Titre de la réunion</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: theme.cardBg, borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="Ex: Sync de Sprint"
                  placeholderTextColor={theme.textSecondary}
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
              </View>

              {/* Date & Time */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Date et Heure</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: theme.cardBg, borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="Format: YYYY-MM-DD HH:MM (Ex: 2026-07-15 14:30)"
                  placeholderTextColor={theme.textSecondary}
                  value={newDateStr}
                  onChangeText={setNewDateStr}
                />
              </View>

              {/* Virtual Link */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Lien de visioconférence</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: theme.cardBg, borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="Ex: https://meet.google.com/..."
                  placeholderTextColor={theme.textSecondary}
                  value={newLink}
                  onChangeText={setNewLink}
                />
              </View>

              {/* Project Selection */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Projet concerné</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {projects.map((proj) => {
                    const isSelected = selectedProjectId === proj.id_projet;
                    return (
                      <TouchableOpacity
                        key={proj.id_projet}
                        style={[
                          styles.projectChip,
                          { backgroundColor: theme.cardBg, borderColor: theme.border },
                          isSelected && { backgroundColor: theme.accent, borderColor: theme.accent }
                        ]}
                        onPress={() => setSelectedProjectId(proj.id_projet)}
                      >
                        <Text style={[styles.projectChipText, { color: theme.textPrimary }, isSelected && { color: "#fff", fontWeight: "700" }]}>
                          {proj.titre}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Agenda */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Ordre du Jour / Description</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputArea, { backgroundColor: theme.cardBg, borderColor: theme.border, color: theme.textPrimary }]}
                  placeholder="Objectif de la réunion, points abordés..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                  value={newAgenda}
                  onChangeText={setNewAgenda}
                />
              </View>

              {/* User Selection (Invitations) */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Inviter des participants</Text>
                <View style={{ gap: 8 }}>
                  {users.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    return (
                      <TouchableOpacity
                        key={user.id}
                        style={[
                          styles.userSelectRow,
                          { backgroundColor: theme.cardBg, borderColor: theme.border },
                          isSelected && { borderColor: theme.accent }
                        ]}
                        onPress={() => toggleUserInvitation(user.id)}
                      >
                        <View style={[styles.avatar, { backgroundColor: theme.accent + "12", borderColor: theme.accent + "33" }]}>
                          <Text style={[styles.avatarText, { color: theme.accent }]}>
                            {user.nom.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.participantName, { color: theme.textPrimary }]}>{user.nom}</Text>
                          <Text style={[styles.participantEmail, { color: theme.textSecondary }]}>{user.email}</Text>
                        </View>
                        <Ionicons
                          name={isSelected ? "checkbox" : "square-outline"}
                          size={20}
                          color={isSelected ? theme.accent : theme.textSecondary}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Submit btn */}
              <TouchableOpacity
                style={[styles.joinLargeBtn, { backgroundColor: theme.accent }, creating && { opacity: 0.7 }]}
                onPress={handleCreateMeeting}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="calendar-outline" size={18} color="#fff" />
                    <Text style={styles.joinLargeBtnText}>Planifier la réunion</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySub: {
    color: "#7e9cb9",
    textAlign: "center",
    fontSize: 13,
  },

  // Meeting Card
  meetingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardDate: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 6,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  // Floating Button
  floatingAddButton: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },

  // Modal Detail
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "86%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 12,
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  modalScrollContent: {
    paddingBottom: 20,
    gap: 16,
  },
  detailGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  detailBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  detailSection: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "800",
  },
  participantName: {
    fontSize: 13,
    fontWeight: "700",
  },
  participantEmail: {
    fontSize: 11,
    marginTop: 1,
  },
  participantStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // RSVP Actions
  rsvpActionContainer: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f59e0b50",
    backgroundColor: "#f59e0b10",
    gap: 10,
  },
  rsvpTitle: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  rsvpBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 38,
    borderRadius: 10,
    gap: 6,
  },
  rsvpBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  joinLargeBtn: {
    flexDirection: "row",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  joinLargeBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  // Form styles
  formGroup: {
    gap: 8,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  formInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  formInputArea: {
    height: 80,
    paddingTop: 10,
  },
  projectChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  projectChipText: {
    fontSize: 12,
  },
  userSelectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
});