import { SimpleDatePicker } from '@/components/SimpleDatePicker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { projectService } from '@/services/projectService';
import { userService } from '@/services/userService';
import { useAppTheme } from "@/theme";
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from "react-i18next";

type User = {
  id: number;
  nom: string;
  email: string;
  role: string;
  initiale: string;
};

type ProjectPriority = 'haute' | 'moyenne' | 'basse';
type ProjectStatus = 'actif' | 'pause' | 'termine';

// ─── NOUVEAU PROJET SCREEN ─────────────────────────────────────────────────────
export default function NouveauProjetScreen() {
  const router = useRouter();
  const { id, edit } = useLocalSearchParams();
  const isEditing = edit === 'true' && !!id;

  const { t } = useTranslation();
  const { theme, isDark } = useAppTheme();
  const COLORS = useMemo(
    () => ({
      bg: theme.bg,
      surface: theme.cardBg,
      card: theme.cardBg,
      border: theme.border,
      accent: theme.accent,
      text: theme.textPrimary,
      textMuted: theme.textSecondary,
      textDim: theme.textSecondary,
      success: '#4caf50',
      warning: '#ff9800',
      danger: '#f44336',
      pause: '#9c27b0',
    }),
    [theme]
  );
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [nom, setNom]                 = useState('');
  const [description, setDescription] = useState('');
  const [membres, setMembres]         = useState<User[]>([]);
  const [dateDebut, setDateDebut]     = useState<Date | null>(null);
  const [dateFin, setDateFin]         = useState<Date | null>(null);
  const [priorite, setPriorite]       = useState<ProjectPriority | null>(null);
  const [statut, setStatut]           = useState<ProjectStatus | null>(null);
  const [chef, setChef]               = useState<User | null>(null);
  const [couleur, setCouleur]         = useState<string | null>(null);
  const [icone, setIcone]             = useState<string | null>(null);
  const [chefModal, setChefModal]     = useState(false);
  const [membresModal, setMembresModal] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [fetching, setFetching]       = useState(false);
  const [users, setUsers]             = useState<User[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [teamId, setTeamId]           = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
      await fetchUsers();
      if (!isEditing) {
        await fetchCurrentUser();
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (isEditing && users.length > 0) {
      fetchProjectDetails();
    }
  }, [id, users]);

  const fetchUsers = async () => {
    try {
      const data = await userService.getUsers();
      const processedUsers = data.map((u: any) => ({
        ...u,
        initiale: u.nom ? u.nom.charAt(0).toUpperCase() : '?'
      }));
      setUsers(processedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const me = await userService.getCurrentUser();
      if (me) {
        const processedMe = {
          ...me,
          initiale: me.nom ? me.nom.charAt(0).toUpperCase() : '?'
        };
        setChef(processedMe);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users;
    return users.filter(u => 
      u.nom.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
  }, [users, userSearchQuery]);

  const fetchProjectDetails = async () => {
    setFetching(true);
    try {
      const project = await projectService.getProjectById(parseInt(id as string));
      
      if (project) {
        setNom(project.titre);
        setDescription(project.description || '');
        setDateDebut(new Date(project.dateDebut));
        setDateFin(new Date(project.dateFin));
        setStatut(project.statut);
        setPriorite(project.priorite);
        
        // Trouver le chef
        if (project.id_administrateur) {
          const foundChef = users.find(u => u.id === project.id_administrateur);
          if (foundChef) setChef(foundChef);
        }

        // Charger les membres de l'équipe
        if (project.equipe) {
          setTeamId(project.equipe.id_equipe);
          const teamMembers = await projectService.getTeamMembers(project.equipe.id_equipe);
          const processedMembers = teamMembers.map((u: any) => ({
            ...u,
            initiale: u.nom ? u.nom.charAt(0).toUpperCase() : '?'
          }));
          setMembres(processedMembers);
        }
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
      Alert.alert(t("common.error"), "Impossible de charger les détails du projet");
    } finally {
      setFetching(false);
    }
  };

  const priorites = [
    { key: 'haute',   label: t("new_project.priority_high"),   color: COLORS.danger,  icon: 'flag' },
    { key: 'moyenne', label: t("new_project.priority_medium"), color: COLORS.warning, icon: 'flag' },
    { key: 'basse',   label: t("new_project.priority_low"),   color: COLORS.success, icon: 'flag' },
  ] as const;

  const statuts = [
    { key: 'actif',   label: t("new_project.status_active"),    color: COLORS.success, icon: 'play-arrow' },
    { key: 'pause',   label: t("new_project.status_paused"), color: COLORS.pause,   icon: 'pause' },
    { key: 'termine', label: t("new_project.status_finished"),  color: COLORS.accent,  icon: 'check' },
  ] as const;

const formatDateForAPI = (d: Date | null) => {
  if (!d) return null;
  return d.toISOString().split('T')[0];
};

  const toggleMembre = (u: User) => {
    if (membres.find(m => m.id === u.id)) {
      setMembres(membres.filter(m => m.id !== u.id));
    } else {
      setMembres([...membres, u]);
    }
  };

  // ── Sauvegarder → retour vers ProjetsScreen avec les données en params ──────
  const validateForm = () => {
    if (!nom.trim()) return t("new_project.project_name_required");
    if (!dateDebut || !dateFin) return t("new_project.dates_required");
    if (dateFin < dateDebut) return t("new_project.dates_invalid") || "La date de fin doit être après la date de début";
    if (!chef) return t("new_project.chef_required") || "Veuillez sélectionner un chef de projet";
    return null;
  };

  const handleSauvegarder = async () => {
    const errorMsg = validateForm();
    if (errorMsg) {
      Alert.alert(t("common.error"), errorMsg);
      return;
    }

    setLoading(true);
    try {
      const dateDebutApi = formatDateForAPI(dateDebut);
      const dateFinApi = formatDateForAPI(dateFin);
      if (!dateDebutApi || !dateFinApi) {
        Alert.alert(t("common.error"), t("new_project.dates_required"));
        return;
      }

      const projectData = {
        titre: nom.trim(),
        description: description.trim(),
        dateDebut: dateDebutApi,
        dateFin: dateFinApi,
        statut: statut || 'actif',
        priorite: priorite || 'moyenne',
        ...(isEditing && chef?.id ? { id_administrateur: chef.id } : {})
      };

      if (isEditing) {
        await projectService.updateProject(parseInt(id as string), projectData);
        
        // Mise à jour des membres de l'équipe si l'équipe existe
        if (teamId) {
          await projectService.syncTeamMembers(teamId, membres.map(m => m.id));
        }
        
        Alert.alert(t("common.success"), t("new_project.update_success") || "Projet mis à jour avec succès");
      } else {
        const newProject = await projectService.createProject(projectData);
        
        // 2. Création de l'équipe associée (seulement à la création)
        const team = await projectService.createTeam({
          nom: `Équipe ${nom.trim()}`,
          description: `Équipe automatique pour le projet ${nom.trim()}`,
          id_projet: newProject.id_projet
        });

        // 3. Ajout des membres à l'équipe
        if (membres.length > 0) {
          await Promise.all(membres.map(m => projectService.addMember(team.id_equipe, m.id)));
        }

        Alert.alert(t("common.success"), t("new_project.create_success") || "Projet créé avec succès");
      }
      
      router.back();
    } catch (error: any) {
      console.error('Error saving project:', {
        message: error?.message,
        status: error?.response?.status,
        detail: error?.response?.data,
        url: error?.config?.url,
        method: error?.config?.method,
      });
      const errorMsg = error.response?.data?.detail || (isEditing ? "Erreur lors de la mise à jour" : t("new_project.create_error"));
      Alert.alert(t("common.error"), errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      t("common.confirm") || "Confirmation",
      t("projects.delete_confirm") || "Voulez-vous vraiment supprimer ce projet ?", // Utilise la traduction
      [
        { text: t("common.cancel") || "Annuler", style: "cancel" },
        { 
          text: t("common.delete") || "Supprimer", 
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await projectService.deleteProject(parseInt(id as string));
              router.back();
            } catch (error: any) {
              console.error('Error deleting project:', error);
              Alert.alert(t("common.error"), error.response?.data?.detail || t("common.error")); // Utilise la traduction
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (fetching) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.bg} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? t("projects.edit_title") || "Modifier Projet" : t("new_project.title")}</Text>
        <TouchableOpacity 
          style={[styles.sauvegarderButton, loading && { opacity: 0.7 }]} 
          onPress={handleSauvegarder} 
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sauvegarderText}>{isEditing ? t("common.update") || "Modifier" : t("common.create") || "Créer"}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

      
        {/* ── Nom du projet ───────────────────────────────────────────────── */}
        <Text style={styles.fieldLabel}>{t("new_project.project_name_label")}</Text>
        <TextInput
          style={styles.textInput}
          placeholder={t("new_project.project_name_placeholder")}
          placeholderTextColor={COLORS.textDim}
          value={nom}
          onChangeText={setNom}
        />

        {/* ── Description ─────────────────────────────────────────────────── */}
        <Text style={styles.fieldLabel}>{t("new_project.description_label")}</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder={t("new_project.description_placeholder")}
          placeholderTextColor={COLORS.textDim}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
        />

        {/* ── Chef de projet ──────────────────────────────────────────────── */}
        <Text style={styles.fieldLabel}>{t("new_project.project_manager_label")}</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setChefModal(true)} activeOpacity={0.8}>
          {chef ? (
            <View style={styles.chefSelected}>
              <View style={styles.chefAvatar}>
                <Text style={styles.chefAvatarText}>{chef.initiale}</Text>
              </View>
              <Text style={styles.chefName}>{chef.nom}</Text>
            </View>
          ) : (
            <Text style={styles.selectPlaceholder}>{t("new_project.project_manager_select")}</Text>
          )}
          <Text style={styles.selectArrow}>›</Text>
        </TouchableOpacity>

        {/* Chef Modal */}
        <Modal visible={chefModal} transparent animationType="slide" onRequestClose={() => setChefModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.listModal}>
              <Text style={styles.listModalTitle}>{t("new_project.project_manager_modal_title")}</Text>
              
              <TextInput
                style={[styles.textInput, { marginBottom: 12 }]}
                placeholder={t("new_project.search_placeholder")}
                placeholderTextColor={COLORS.textDim}
                value={userSearchQuery}
                onChangeText={setUserSearchQuery}
              />

              <ScrollView style={{ maxHeight: 300 }}>
                {filteredUsers.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.listModalItem, chef?.id === c.id && styles.listModalItemActive]}
                    onPress={() => { setChef(c); setChefModal(false); setUserSearchQuery(''); }}
                  >
                    <View style={styles.chefAvatar}>
                      <Text style={styles.chefAvatarText}>{c.initiale}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listModalItemText}>{c.nom}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>{c.email}</Text>
                    </View>
                    {chef?.id === c.id && <Text style={{ color: COLORS.accent, fontSize: 16 }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.listModalClose} onPress={() => { setChefModal(false); setUserSearchQuery(''); }}>
                <Text style={styles.listModalCloseText}>{t("new_project.close")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>


        {/* ── Priorité ────────────────────────────────────────────────────── */}
        <Text style={styles.fieldLabel}>{t("new_project.priority_label")}</Text>
        <View style={styles.chipRow}>
          {priorites.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.priorityChip,
                { borderColor: p.color },
                priorite === p.key && { backgroundColor: p.color },
              ]}
              onPress={() => setPriorite(p.key)}
              activeOpacity={0.8}
            >
              <MaterialIcons 
                name={p.icon as any} 
                size={16} 
                color={priorite === p.key ? '#fff' : p.color} 
              />
              <Text style={[styles.chipLabel, priorite === p.key && styles.chipLabelActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Statut ──────────────────────────────────────────────────────── */}
        <Text style={styles.fieldLabel}>{t("new_project.status_label")}</Text>
        <View style={styles.chipRow}>
          {statuts.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[
                styles.statutChip,
                { borderColor: s.color },
                statut === s.key && { backgroundColor: s.color },
              ]}
              onPress={() => setStatut(s.key)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons 
                  name={s.icon as any} 
                  size={16} 
                  color={statut === s.key ? '#fff' : s.color} 
                />
                <Text style={[styles.chipLabel, statut === s.key && styles.chipLabelActive]}>
                  {s.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Dates ───────────────────────────────────────────────────────── */}
        <Text style={styles.fieldLabel}>{t("new_project.start_date_label")}</Text>
        <SimpleDatePicker label={t("new_project.start_date_label")} value={dateDebut} onChange={setDateDebut} />

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>{t("new_project.end_date_label")}</Text>
        <SimpleDatePicker label={t("new_project.end_date_label")} value={dateFin} onChange={setDateFin} />

        {/* ── Membres ─────────────────────────────────────────────────────── */}
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
          {t("new_project.team_members_label")} ({membres.length})
        </Text>
        <TouchableOpacity style={styles.addMemberBtn} activeOpacity={0.7} onPress={() => setMembresModal(true)}>
          <Text style={styles.addMemberIcon}>+</Text>
          <Text style={styles.addMemberText}>{t("new_project.add_member")}</Text>
        </TouchableOpacity>

        {/* Membres Modal */}
        <Modal visible={membresModal} transparent animationType="slide" onRequestClose={() => setMembresModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.listModal}>
              <Text style={styles.listModalTitle}>{t("new_project.team_members_label")}</Text>
              
              <TextInput
                style={[styles.textInput, { marginBottom: 12 }]}
                placeholder={t("new_project.search_placeholder")}
                placeholderTextColor={COLORS.textDim}
                value={userSearchQuery}
                onChangeText={setUserSearchQuery}
              />

              <ScrollView style={{ maxHeight: 300 }}>
                {filteredUsers.map((u) => {
                  const isSelected = membres.find(m => m.id === u.id);
                  return (
                    <TouchableOpacity
                      key={u.id}
                      style={[styles.listModalItem, isSelected && styles.listModalItemActive]}
                      onPress={() => toggleMembre(u)}
                    >
                      <View style={styles.chefAvatar}>
                        <Text style={styles.chefAvatarText}>{u.initiale}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listModalItemText}>{u.nom}</Text>
                        <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>{u.email}</Text>
                      </View>
                      {isSelected && <Text style={{ color: COLORS.accent, fontSize: 16 }}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity style={styles.listModalClose} onPress={() => { setMembresModal(false); setUserSearchQuery(''); }}>
                <Text style={styles.listModalCloseText}>{t("new_project.confirm")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {membres.map((m, i) => (
          <View key={m.id} style={styles.memberItem}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>{m.initiale}</Text>
            </View>
            <Text style={styles.memberName}>{m.nom}</Text>
            <TouchableOpacity onPress={() => setMembres(membres.filter(u => u.id !== m.id))}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        ))}

        {isEditing && (
          <TouchableOpacity 
            style={styles.deleteProjectBtn} 
            onPress={handleDelete}
            disabled={loading}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.deleteProjectText}>{t("common.delete_project")}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const createStyles = (COLORS: {
  bg: string;
  surface: string;
  card: string;
  border: string;
  accent: string;
  text: string;
  textMuted: string;
  textDim: string;
  success: string;
  warning: string;
  danger: string;
  pause: string;
}) =>
StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn:           { padding: 4, width: 32 },
  backText:          { fontSize: 28, color: COLORS.text, fontWeight: '300' },
  title:             { fontSize: 17, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center' },
  sauvegarderButton: { backgroundColor: COLORS.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  sauvegarderText:   { color: '#fff', fontWeight: '700', fontSize: 13 },

  body:       { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  fieldLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600', marginBottom: 8 },

  // Inputs
  textInput: {
    backgroundColor: COLORS.card, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13,
    color: COLORS.text, fontSize: 14, marginBottom: 18,
    borderWidth: 1, borderColor: COLORS.border,
  },
  textArea: { minHeight: 100, paddingTop: 13 },

  // Select
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, marginBottom: 18,
    borderWidth: 1, borderColor: COLORS.border,
  },
  selectPlaceholder: { color: COLORS.textDim, fontSize: 14 },
  selectArrow:       { color: COLORS.textMuted, fontSize: 22 },
  chefSelected:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chefAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center',
  },
  chefAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  chefName:       { color: COLORS.text, fontSize: 14 },

  // Chips
  chipRow:      { flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' },
  priorityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1.5, backgroundColor: COLORS.card,
  },
  statutChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1.5, backgroundColor: COLORS.card,
  },
  chipIcon:        { fontSize: 13 },
  chipLabel:       { color: COLORS.textMuted, fontSize: 13 },
  chipLabelActive: { color: '#fff', fontWeight: '700' },

  // Date
  dateBtnIcon: { fontSize: 16 },
  dateBtnText: { color: COLORS.text, fontSize: 14 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },

  // Chef Modal
  listModal: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 20,
    width: '100%', borderWidth: 1, borderColor: COLORS.border,
  },
  listModalTitle: { color: COLORS.text, fontWeight: '700', fontSize: 16, marginBottom: 14 },
  listModalItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 10,
    borderRadius: 10, marginBottom: 6, backgroundColor: COLORS.card,
  },
  listModalItemActive: { borderWidth: 1, borderColor: COLORS.accent },
  listModalItemText:   { flex: 1, color: COLORS.text, fontSize: 14 },
  listModalClose: {
    marginTop: 8, paddingVertical: 11, borderRadius: 10,
    backgroundColor: COLORS.card, alignItems: 'center',
  },
  listModalCloseText: { color: COLORS.textMuted, fontWeight: '600' },

  // Membres
  addMemberBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: COLORS.border,
    borderStyle: 'dashed', marginBottom: 10, gap: 10,
  },
  addMemberIcon: { fontSize: 20, color: COLORS.accent, fontWeight: '300' },
  addMemberText: { fontSize: 14, color: COLORS.textMuted },
  memberItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, gap: 12,
  },
  memberAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center',
  },
  memberAvatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  memberName:       { flex: 1, color: COLORS.text, fontSize: 14 },
  memberRemove:     { color: COLORS.textMuted, fontSize: 16 },

  deleteProjectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#f44336', paddingVertical: 14, borderRadius: 12,
    marginTop: 30, marginBottom: 10,
  },
  deleteProjectText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
