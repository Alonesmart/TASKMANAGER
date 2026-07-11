import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { invitationService, type Invitation } from "../services/invitationService";
import { useAppTheme } from "../theme";

interface InvitationSectionProps {
  idProjet: number;
}

export default function InvitationSection({ idProjet }: InvitationSectionProps) {
  const { theme } = useAppTheme();
  
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [emailInput, setEmailInput] = useState("");
  const [roleInput, setRoleInput] = useState("collaborateur"); // "chef_projet", "collaborateur", "invite_externe"
  const [sending, setSending] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersData, invsData] = await Promise.all([
        invitationService.getProjectMembers(idProjet),
        invitationService.getPendingInvitations(idProjet),
      ]);
      setMembers(membersData);
      setInvitations(invsData);
    } catch (error) {
      console.error("Error loading members/invitations:", error);
    } finally {
      setLoading(false);
    }
  }, [idProjet]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSendInvitation = async () => {
    if (!emailInput.trim()) {
      Alert.alert("Erreur", "Veuillez entrer une adresse email valide.");
      return;
    }

    setSending(true);
    try {
      await invitationService.inviteUser(idProjet, emailInput.trim(), roleInput);
      Alert.alert("Succès", "Invitation envoyée avec succès.");
      setEmailInput("");
      setShowInviteForm(false);
      fetchData();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      const detail = error?.response?.data?.detail || "Impossible d'envoyer l'invitation.";
      Alert.alert("Erreur", detail);
    } finally {
      setSending(false);
    }
  };

  const handleCancelInvitation = (inv: Invitation) => {
    Alert.alert(
      "Annuler l'invitation",
      `Voulez-vous annuler l'invitation pour "${inv.email_invite}" ?`,
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui, annuler",
          style: "destructive",
          onPress: async () => {
            try {
              await invitationService.cancelInvitation(inv.id);
              Alert.alert("Succès", "Invitation annulée.");
              fetchData();
            } catch (error) {
              console.error("Error cancelling invitation:", error);
              Alert.alert("Erreur", "Impossible d'annuler l'invitation.");
            }
          },
        },
      ]
    );
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "chef_projet":
        return { bg: "#4a3b8c22", text: "#9d82f7" };
      case "collaborateur":
        return { bg: "#2d5a2722", text: "#4caf50" };
      case "invite_externe":
        return { bg: "#e6510022", text: "#ff9800" };
      default:
        return { bg: "#33333322", text: "#999999" };
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "chef_projet":
        return "Chef de Projet";
      case "collaborateur":
        return "Collaborateur";
      case "invite_externe":
        return "Invité Externe";
      default:
        return role;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Membres & Rôles</Text>
        <TouchableOpacity
          onPress={() => setShowInviteForm(!showInviteForm)}
          style={[styles.actionButton, { backgroundColor: theme.activeBg }]}
        >
          <Ionicons name={showInviteForm ? "close" : "person-add-outline"} size={16} color={theme.accent} />
          <Text style={[styles.actionButtonText, { color: theme.accent }]}>
            {showInviteForm ? "Annuler" : "Inviter"}
          </Text>
        </TouchableOpacity>
      </View>

      {showInviteForm && (
        <View style={[styles.inviteCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Nouvelle Invitation</Text>
          
          <TextInput
            placeholder="Adresse email du collaborateur"
            placeholderTextColor={theme.textMuted}
            value={emailInput}
            onChangeText={setEmailInput}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.bg }]}
          />

          <View style={styles.rolePickerRow}>
            <Text style={[styles.rolePickerLabel, { color: theme.textSecondary }]}>Rôle proposé :</Text>
            <View style={styles.roleOptions}>
              {["chef_projet", "collaborateur", "invite_externe"].map((r) => {
                const isSelected = roleInput === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRoleInput(r)}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor: isSelected ? theme.accent : theme.bg,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.roleChipText, { color: isSelected ? "#fff" : theme.textSecondary }]}>
                      {getRoleLabel(r)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSendInvitation}
            disabled={sending}
            style={[styles.submitButton, { backgroundColor: theme.accent }]}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Envoyer l'invitation</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="small" color={theme.accent} style={styles.loader} />
      ) : (
        <View style={styles.listsContainer}>
          {/* Members List */}
          {members.length > 0 && (
            <View style={styles.subSection}>
              <Text style={[styles.subTitle, { color: theme.textSecondary }]}>Membres Actifs ({members.length})</Text>
              <View style={styles.list}>
                {members.map((item) => {
                  const badgeColors = getRoleBadgeColor(item.role);
                  return (
                    <View
                      key={item.id.toString()}
                      style={[styles.memberRow, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                    >
                      <View style={styles.memberAvatar}>
                        <Text style={styles.avatarText}>{item.nom?.charAt(0).toUpperCase() || "?"}</Text>
                      </View>
                      <View style={styles.memberMeta}>
                        <Text style={[styles.memberName, { color: theme.textPrimary }]}>{item.nom}</Text>
                        <Text style={[styles.memberEmail, { color: theme.textSecondary }]}>{item.email}</Text>
                      </View>
                      <View style={[styles.roleBadge, { backgroundColor: badgeColors.bg }]}>
                        <Text style={[styles.roleBadgeText, { color: badgeColors.text }]}>
                          {getRoleLabel(item.role)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Pending Invitations List */}
          {invitations.length > 0 && (
            <View style={styles.subSection}>
              <Text style={[styles.subTitle, { color: theme.textSecondary }]}>Invitations en attente ({invitations.length})</Text>
              <View style={styles.list}>
                {invitations.map((item) => {
                  const badgeColors = getRoleBadgeColor(item.role_propose);
                  return (
                    <View
                      key={item.id.toString()}
                      style={[styles.memberRow, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                    >
                      <View style={styles.memberMeta}>
                        <Text style={[styles.memberName, { color: theme.textPrimary }]}>{item.email_invite}</Text>
                        <Text style={[styles.memberEmail, { color: theme.textSecondary }]}>
                          Expire le {new Date(item.expires_at).toLocaleDateString()}
                        </Text>
                      </View>
                      
                      <View style={styles.invitationActions}>
                        <View style={[styles.roleBadge, { backgroundColor: badgeColors.bg }]}>
                          <Text style={[styles.roleBadgeText, { color: badgeColors.text }]}>
                            {getRoleLabel(item.role_propose)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleCancelInvitation(item)}
                          style={[styles.cancelBtn, { backgroundColor: theme.danger + "22" || "#ff572222" }]}
                        >
                          <Ionicons name="trash-outline" size={14} color={theme.danger || "#ff5722"} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  inviteCard: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  rolePickerRow: {
    gap: 6,
  },
  rolePickerLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  roleOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  roleChip: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  submitButton: {
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  loader: {
    marginVertical: 10,
  },
  listsContainer: {
    gap: 15,
  },
  subSection: {
    gap: 8,
  },
  subTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  list: {
    gap: 8,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4a3b8c",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  memberMeta: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: 13,
    fontWeight: "600",
  },
  memberEmail: {
    fontSize: 11,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  invitationActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cancelBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
});
