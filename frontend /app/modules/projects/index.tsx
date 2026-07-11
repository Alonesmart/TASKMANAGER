import { projectService, type Project } from '@/services/projectService';
import { teamService } from '@/services/teamService';
import { userService } from '@/services/userService';
import { aiService } from '@/services/aiService';
import { taskService } from '@/services/taskService';
import { TeamMembers } from '@/app/modules/teams';
import { AppTheme, useAppTheme } from "@/theme";
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from "react-i18next";
import AddButton from "../../../components/AddButton";
import DocumentSection from "../../../components/DocumentSection";
import InvitationSection from "../../../components/InvitationSection";
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
import { Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const createColors = (theme: AppTheme) => ({
  bg: theme.bg,
  surface: theme.surface,
  card: theme.cardBg,
  border: theme.border,
  accent: theme.accent,
  text: theme.textPrimary,
  textMuted: theme.textSecondary,
  textDim: theme.textMuted,
  success: theme.success,
  warning: theme.warning,
  danger: theme.danger,
  pause: theme.pause,
});

type ProjectColors = ReturnType<typeof createColors>;

// ─── TYPES ─────────────────────────────────────────────────────────────────────
type User = {
  id: number;
  nom: string;
  email: string;
  phone?: string | null;
  role: string;
  actif?: boolean;
};

// ─── BADGE PRIORITÉ ────────────────────────────────────────────────────────────
const PrioriteBadge = ({ value, colors, badgeStyles }: { value: string; colors: ProjectColors; badgeStyles: ReturnType<typeof createBadgeStyles> }) => {
  const { t } = useTranslation();
  if (!value) return null;
  const map: Record<string, { label: string; color: string }> = {
    haute:   { label: t("tasks.priority_high"),   color: colors.danger },
    moyenne: { label: t("tasks.priority_medium"), color: colors.warning },
    basse:   { label: t("tasks.priority_low"),   color: colors.success },
  };
  const p = map[value];
  if (!p) return null;
  return (
    <View style={[badgeStyles.badge, { borderColor: p.color }]}>
      <Text style={[badgeStyles.label, { color: p.color }]}>{p.label}</Text>
    </View>
  );
};

// ─── BADGE STATUT ──────────────────────────────────────────────────────────────
const StatutBadge = ({ value, colors, badgeStyles }: { value: string; colors: ProjectColors; badgeStyles: ReturnType<typeof createBadgeStyles> }) => {
  const { t } = useTranslation();
  if (!value) return null;
  const map: Record<string, { label: string; color: string }> = {
    actif:   { label: t("new_project.status_active"),    color: colors.success },
    pause:   { label: t("new_project.status_paused"), color: colors.pause },
    termine: { label: t("new_project.status_finished"),  color: colors.accent },
  };
  const s = map[value];
  if (!s) return null;
  return (
    <View style={[badgeStyles.badge, { borderColor: s.color, backgroundColor: s.color + '22' }]}>
      <Text style={[badgeStyles.label, { color: s.color }]}>{s.label}</Text>
    </View>
  );
};

const createBadgeStyles = () => StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 12, borderWidth: 1,
    backgroundColor: 'transparent',
  },
  icon:  { fontSize: 10 },
  label: { fontSize: 11, fontWeight: '600' },
});

// ─── PROJECT CARD ──────────────────────────────────────────────────────────────
const ProjectCard = ({
  project,
  colors,
  styles,
  badgeStyles,
  onEdit,
  onDelete,
  onDetails,
  isAdmin,
}: {
  project: Project;
  colors: ProjectColors;
  styles: ReturnType<typeof createStyles>;
  badgeStyles: ReturnType<typeof createBadgeStyles>;
  onEdit: (p: Project) => void;
  onDelete: (id: number) => void;
  onDetails: (p: Project) => void;
  isAdmin: boolean;
}) => {
  const { t } = useTranslation();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const canModify = isAdmin && !!project.id_administrateur;

  return (
    <View style={styles.projectCard}>
      {/* Top row: icone + couleur + nom + actions */}
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconBox, { backgroundColor: project.couleur || colors.accent }]}>
          <Text style={styles.cardIconText}>{project.icone || '📁'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.projectName} numberOfLines={1}>{project.titre}</Text>
          {!!project.id_administrateur && (
            <Text style={styles.projectChef}>👤 Admin ID: {project.id_administrateur}</Text>
          )}
        </View>
        {canModify && (
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={() => onEdit(project)} style={styles.actionBtn}>
              <Ionicons name="pencil" size={18} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(project.id_projet)} style={styles.actionBtn}>
              <Ionicons name="trash" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Description */}
      {!!project.description && (
        <Text style={styles.projectDesc} numberOfLines={2}>{project.description}</Text>
      )}

      {/* Dates */}
      {(!!project.dateDebut || !!project.dateFin) && (
        <View style={styles.datesRow}>
          {!!project.dateDebut && (
            <Text style={styles.dateText}>📅 Début : {formatDate(project.dateDebut)}</Text>
          )}
          {!!project.dateFin && (
            <Text style={styles.dateText}>🏁 Fin : {formatDate(project.dateFin)}</Text>
          )}
        </View>
      )}

      {/* Badges */}
      {(!!project.statut || !!project.priorite) && (
        <View style={styles.badgesRow}>
          {!!project.priorite && <PrioriteBadge value={project.priorite} colors={colors} badgeStyles={badgeStyles} />}
          {!!project.statut && <StatutBadge value={project.statut} colors={colors} badgeStyles={badgeStyles} />}
        </View>
      )}

      <TouchableOpacity style={styles.detailsBtn} onPress={() => onDetails(project)} activeOpacity={0.8}>
        <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
        <Text style={styles.detailsBtnText}>{t("projects.details")}</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── PROJETS SCREEN ────────────────────────────────────────────────────────────
export default function ProjetsScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { theme, isDark } = useAppTheme();
  const COLORS = React.useMemo(() => createColors(theme), [theme]);
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);
  const badgeStyles = React.useMemo(() => createBadgeStyles(), []);

  const [activeFilter, setActiveFilter] = useState('tous');
  const [search, setSearch]             = useState('');
  const [projects, setProjects]         = useState<Project[]>([]);
  const [loading, setLoading]           = useState(true);
  const [isAdmin, setIsAdmin]           = useState(false);
  const [snackbar, setSnackbar]         = useState({ visible: false, message: '', type: 'info' });
  const [users, setUsers]               = useState<User[]>([]);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectMembers, setProjectMembers] = useState<User[]>([]);

  // IA Module State
  const [loadingRisks, setLoadingRisks]           = useState(false);
  const [risks, setRisks]                         = useState<any[]>([]);
  const [loadingAllocation, setLoadingAllocation] = useState(false);
  const [allocations, setAllocations]             = useState<any[]>([]);
  const [applyingAllocations, setApplyingAllocations] = useState(false);

  const filters = [
    { key: 'tous',      label: t("projects.filter_all") },
    { key: 'actifs',    label: t("projects.filter_active") },
    { key: 'pause',     label: "pausse" },
    { key: 'termine',   label: t("projects.filter_done") },
  ];

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const user = await userService.getCurrentUser();
        setIsAdmin(user?.role === 'admin');
        const allUsers = await userService.getUsers();
        setUsers(allUsers);
        await fetchProjects();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [isFocused]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      showFeedback(t("common.error_fetch"), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeRisks = async () => {
    if (!selectedProject) return;
    setLoadingRisks(true);
    try {
      const data = await aiService.getProjectRisks(selectedProject.id_projet);
      setRisks(data.risques);
    } catch (error) {
      console.error("Error analyzing project risks:", error);
      Alert.alert(t("common.error"), "Impossible d'analyser les risques de retard.");
    } finally {
      setLoadingRisks(false);
    }
  };

  const handleSuggestAllocation = async () => {
    if (!selectedProject) return;
    setLoadingAllocation(true);
    try {
      const allTasks = await taskService.getTasks({ id_projet: selectedProject.id_projet });
      const activeTasks = allTasks.filter(t => t.statut !== 'terminees');
      if (activeTasks.length === 0) {
        Alert.alert("Information", "Aucune tâche active à répartir dans ce projet.");
        setLoadingAllocation(false);
        return;
      }
      
      const taskIds = activeTasks.map(t => t.id_tache);
      const res = await aiService.suggestAllocation(selectedProject.id_projet, taskIds);
      
      const mapped = res.repartition.map(item => {
        const task = activeTasks.find(t => t.id_tache === item.id_tache);
        const user = users.find(u => u.id === item.id_utilisateur);
        return {
          id_tache: item.id_tache,
          titre_tache: task?.titre || `Tâche #${item.id_tache}`,
          id_utilisateur: item.id_utilisateur,
          nom_utilisateur: user?.nom || `Collaborateur #${item.id_utilisateur}`,
          taskObject: task
        };
      });
      
      setAllocations(mapped);
    } catch (error) {
      console.error("Error calculating task allocations:", error);
      Alert.alert(t("common.error"), "Impossible de calculer la répartition optimale.");
    } finally {
      setLoadingAllocation(false);
    }
  };

  const handleApplyAllocation = async () => {
    if (allocations.length === 0) return;
    setApplyingAllocations(true);
    try {
      await Promise.all(allocations.map(async (item) => {
        if (item.taskObject) {
          const updatePayload = {
            titre: item.taskObject.titre,
            description: item.taskObject.description,
            priorite: item.taskObject.priorite,
            statut: item.taskObject.statut,
            echeance: item.taskObject.echeance,
            progression: item.taskObject.progression,
            assigned_user_ids: [item.id_utilisateur]
          };
          await projectService.updateTask(item.id_tache, updatePayload);
        }
      }));
      Alert.alert(t("common.success"), "La répartition des tâches a été appliquée avec succès.");
      setAllocations([]);
    } catch (error) {
      console.error("Error applying allocations:", error);
      Alert.alert(t("common.error"), "Une erreur est survenue lors de l'application de la répartition.");
    } finally {
      setApplyingAllocations(false);
    }
  };

  const closeDetailsModal = () => {
    setDetailsVisible(false);
    setRisks([]);
    setAllocations([]);
  };

  const showFeedback = (message: string, type: string = 'info') => {
    setSnackbar({ visible: true, message, type });
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      t("common.confirm") || "Confirmation",
      t("projects.delete_confirm") || "Voulez-vous vraiment supprimer ce projet ?",
      [
        { text: t("common.cancel") || "Annuler", style: "cancel" },
        { 
          text: t("common.delete") || "Supprimer", 
          style: "destructive",
          onPress: async () => {
            try {
              await projectService.deleteProject(id);
              showFeedback(t("common.success_delete"));
              fetchProjects();
            } catch (error: any) {
              showFeedback(error.response?.data?.detail || t("common.error"), 'error');
            }
          }
        }
      ]
    );
  };

  const handleEdit = (project: Project) => {
    router.push({
      pathname: "/(tabs)/Home/new-projet",
      params: { 
        id: project.id_projet.toString(),
        edit: 'true'
      }
    });
  };

  const handleDetails = async (project: Project) => {
    setSelectedProject(project);
    setProjectMembers([]);
    setDetailsVisible(true);
    setDetailsLoading(true);

    try {
      const fullProject = await projectService.getProjectById(project.id_projet);
      setSelectedProject(fullProject);

      if (fullProject?.equipe?.id_equipe) {
        const members = await teamService.getTeamMembers(fullProject.equipe.id_equipe);
        setProjectMembers(members);
      }
    } catch (error: any) {
      console.error('Error fetching project details:', error);
      showFeedback(error.response?.data?.detail || "Impossible de charger les détails du projet", 'error');
    } finally {
      setDetailsLoading(false);
    }
  };

  const formatModalDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const getStatusMeta = (value?: string) => {
    const map: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
      actif: { label: t("new_project.status_active"), color: COLORS.success, icon: "play-circle" },
      pause: { label: t("new_project.status_paused"), color: COLORS.pause, icon: "pause-circle" },
      termine: { label: t("new_project.status_finished"), color: COLORS.accent, icon: "checkmark-circle" },
    };
    return map[value || ""] || { label: value || "-", color: COLORS.textMuted, icon: "ellipse" };
  };

  const getPriorityMeta = (value?: string) => {
    const map: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
      haute: { label: t("tasks.priority_high"), color: COLORS.danger, icon: "flag" },
      moyenne: { label: t("tasks.priority_medium"), color: COLORS.warning, icon: "flag-outline" },
      basse: { label: t("tasks.priority_low"), color: COLORS.success, icon: "leaf-outline" },
    };
    return map[value || ""] || { label: value || "-", color: COLORS.textMuted, icon: "pricetag-outline" };
  };

  // ── Filtrage par recherche + filtre statut ─────────────────────────────────
  const filteredProjects = projects.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || p.titre.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
      const matchFilter =
        activeFilter === 'tous'      ? true :
        activeFilter === 'actifs'    ? p.statut === 'actif' :
             activeFilter === 'pause'     ? p.statut === 'pause' :
        activeFilter === 'termine'   ? p.statut === 'termine' :
        true;
    return matchSearch && matchFilter;
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t("projects.title")}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {loading && <ActivityIndicator size="small" color={COLORS.accent} />}
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t("projects.search_placeholder")}
            placeholderTextColor={COLORS.textDim}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: COLORS.textMuted, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
            {/* Compteur */}
            {f.key !== 'tous' && (
              <Text style={[styles.filterCount, activeFilter === f.key && { color: COLORS.bg }]}>
                {projects.filter((p) =>
                  f.key === 'actifs'    ? p.statut === 'actif' :
                  f.key === 'pause'     ? p.statut === 'pause' :
                  f.key === 'termine'   ? p.statut === 'termine' : true
                  
                ).length}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* List or Empty */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : filteredProjects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIcon}>📁</Text>
          </View>
          <Text style={styles.emptyTitle}>{t("projects.empty_title")}</Text>
          <Text style={styles.emptySubtitle}>
            {t("projects.empty_subtitle")}
          </Text>
          {isAdmin && (
            <TouchableOpacity 
              style={styles.emptyCreateBtn} 
              onPress={() => router.push("/(tabs)/Home/new-projet")}
            >
              <Text style={styles.emptyCreateBtnText}>{t("new_project.title")}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : ( // Only render ScrollView if there are projects
        <ScrollView
          style={styles.listWrap}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {filteredProjects.map((p) => (
            <ProjectCard 
              key={p.id_projet} 
              project={p} 
              colors={COLORS} 
              styles={styles} 
              badgeStyles={badgeStyles} 
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDetails={handleDetails}
              isAdmin={isAdmin}
            />
          ))}
        </ScrollView>
      )}

      {isAdmin && (
        <AddButton
          onPress={() => router.push("/(tabs)/Home/new-projet")}
          backgroundColor={COLORS.accent}
          accessibilityLabel="Ajouter un projet"
          shadowColor={COLORS.accent}
          size={56}
          iconSize={32}
          style={styles.floatingAddButton}
        />
      )}

      <Modal
        visible={detailsVisible}
        animationType="slide"
        transparent
        onRequestClose={closeDetailsModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalEyebrow}>nom du projet</Text>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {selectedProject?.titre || t("projects.details")}
                </Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeDetailsModal}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {detailsLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={COLORS.accent} />
              </View>
            ) : selectedProject ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                <View style={styles.modalHero}>
                  <View style={styles.modalHeroIcon}>
                    <Ionicons name="folder-open" size={26} color={COLORS.accent} />
                  </View>
                  <View style={styles.modalHeroContent}>
                    <Text style={styles.modalHeroLabel}>{t("nom  du projet")}</Text>
                    <Text style={styles.modalHeroTitle} numberOfLines={2}>{selectedProject.titre}</Text>
                    {!!selectedProject.description && (
                      <Text style={styles.modalDescription} numberOfLines={4}>
                        {selectedProject.description}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.summaryRow}>
                  {(() => {
                    const status = getStatusMeta(selectedProject.statut);
                    const priority = getPriorityMeta(selectedProject.priorite);
                    return (
                      <>
                        <View style={[styles.summaryPill, { borderColor: status.color + '55', backgroundColor: status.color + '14' }]}>
                          <Ionicons name={status.icon} size={16} color={status.color} />
                          <Text style={[styles.summaryPillText, { color: status.color }]}>{status.label}</Text>
                        </View>
                        <View style={[styles.summaryPill, { borderColor: priority.color + '55', backgroundColor: priority.color + '14' }]}>
                          <Ionicons name={priority.icon} size={16} color={priority.color} />
                          <Text style={[styles.summaryPillText, { color: priority.color }]}>{priority.label}</Text>
                        </View>
                      </>
                    );
                  })()}
                </View>

                <View style={styles.dateGrid}>
                  <View style={styles.dateBox}>
                    <View style={styles.dateIcon}>
                      <Ionicons name="calendar-outline" size={16} color={COLORS.accent} />
                    </View>
                    <Text style={styles.detailLabel}>Date de début</Text>
                    <Text style={styles.dateValue}>{formatModalDate(selectedProject.dateDebut)}</Text>
                  </View>
                  <View style={styles.dateBox}>
                    <View style={styles.dateIcon}>
                      <Ionicons name="flag-outline" size={16} color={COLORS.warning} />
                    </View>
                    <Text style={styles.detailLabel}>Date de fin</Text>
                    <Text style={styles.dateValue}>{formatModalDate(selectedProject.dateFin)}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="person-circle-outline" size={18} color={COLORS.accent} />
                    <Text style={styles.sectionTitle}>Chef du projet</Text>
                  </View>
                  {(() => {
                    const chef = users.find((u) => u.id === selectedProject.id_administrateur);
                    return (
                      <View style={styles.personRow}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{chef?.nom?.charAt(0).toUpperCase() || "?"}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.personName}>{chef?.nom || `${t("projects.user")} #${selectedProject.id_administrateur || "-"}`}</Text>
                          {!!chef?.email && <Text style={styles.personMeta}>{chef.email}</Text>}
                        </View>
                      </View>
                    );
                  })()}
                </View>

                <View style={styles.detailSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="people-outline" size={18} color={COLORS.accent} />
                    <Text style={styles.sectionTitle}>Équipe associée</Text>
                  </View>
                  <Text style={styles.teamName}>
                    {selectedProject.equipe?.nom || t("projects.no_team")}
                  </Text>
                  {!!selectedProject.equipe?.description && (
                    <Text style={styles.detailHint}>{selectedProject.equipe.description}</Text>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="person-add-outline" size={18} color={COLORS.accent} />
                    <Text style={styles.sectionTitle}>Membres de l&apos;équipe</Text>
                    <View style={styles.memberCount}>
                      <Text style={styles.memberCountText}>{projectMembers.length}</Text>
                    </View>
                  </View>
                  {projectMembers.length === 0 ? (
                    <View style={styles.emptyMembers}>
                      <Ionicons name="people-circle-outline" size={30} color={COLORS.textDim} />
                      <Text style={styles.detailHint}>{t("projects.no_team_members")}</Text>
                    </View>
                  ) : (
                    projectMembers.map((member) => (
                      <View key={member.id} style={styles.personRow}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{member.nom?.charAt(0).toUpperCase() || "?"}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.personName}>{member.nom}</Text>
                          <Text style={styles.personMeta}>{member.email}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* ── Risques de Retard (IA) ── */}
                <View style={styles.detailSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="warning-outline" size={18} color="#ef4444" />
                    <Text style={styles.sectionTitle}>Risques de Retard (IA)</Text>
                  </View>
                  {loadingRisks ? (
                    <ActivityIndicator size="small" color={COLORS.accent} />
                  ) : risks.length > 0 ? (
                    <View style={{ gap: 10 }}>
                      {risks.map((item) => {
                        const isHigh = item.risque === 'eleve';
                        const isMed = item.risque === 'moyen';
                        const badgeColor = isHigh ? '#ef4444' : isMed ? '#f59e0b' : '#10b981';
                        return (
                          <View key={item.id_tache} style={styles.iaRiskRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.iaRiskTaskTitle, { color: COLORS.text }]}>{item.titre}</Text>
                              <Text style={[styles.iaRiskReason, { color: COLORS.textMuted }]}>{item.raison}</Text>
                            </View>
                            <View style={[styles.iaRiskBadge, { backgroundColor: badgeColor + '15', borderColor: badgeColor }]}>
                              <Text style={[styles.iaRiskBadgeText, { color: badgeColor }]}>
                                {item.risque.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.iaActionButton} onPress={handleAnalyzeRisks} activeOpacity={0.8}>
                      <Ionicons name="pulse" size={14} color="#fff" />
                      <Text style={styles.iaActionButtonText}>Analyser les risques</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* ── Répartition Optimale (IA) ── */}
                <View style={styles.detailSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="git-network-outline" size={18} color={COLORS.accent} />
                    <Text style={styles.sectionTitle}>Répartition des Tâches (IA)</Text>
                  </View>
                  {loadingAllocation ? (
                    <ActivityIndicator size="small" color={COLORS.accent} />
                  ) : allocations.length > 0 ? (
                    <View style={{ gap: 10 }}>
                      {allocations.map((item) => (
                        <View key={item.id_tache} style={styles.iaAllocRow}>
                          <Text style={[styles.iaAllocTask, { color: COLORS.text }]} numberOfLines={1}>{item.titre_tache}</Text>
                          <Ionicons name="arrow-forward" size={12} color={COLORS.textMuted} />
                          <Text style={[styles.iaAllocUser, { color: COLORS.accent }]} numberOfLines={1}>{item.nom_utilisateur}</Text>
                        </View>
                      ))}
                      <TouchableOpacity
                        style={[styles.iaApplyButton, applyingAllocations && { opacity: 0.7 }]}
                        onPress={handleApplyAllocation}
                        disabled={applyingAllocations}
                        activeOpacity={0.8}
                      >
                        {applyingAllocations ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="checkmark" size={14} color="#fff" />
                            <Text style={styles.iaApplyButtonText}>Appliquer la répartition</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.iaActionButton} onPress={handleSuggestAllocation} activeOpacity={0.8}>
                      <Ionicons name="shuffle" size={14} color="#fff" />
                      <Text style={styles.iaActionButtonText}>Calculer la répartition</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <DocumentSection idProjet={selectedProject.id_projet} />
                <InvitationSection idProjet={selectedProject.id_projet} />
              </ScrollView>
            ) : (
              <View style={styles.modalLoading}>
                <Text style={styles.detailHint}>Aucun détail disponible.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
        style={{ backgroundColor: snackbar.type === 'error' ? COLORS.danger : COLORS.surface }}
        action={{ label: 'OK', onPress: () => {} }}
      >
        {snackbar.message}
      </Snackbar>
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const createStyles = (COLORS: ProjectColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: 0.3 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, gap: 10, marginBottom: 12,
  },
  searchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 10,
    paddingHorizontal: 12, height: 42,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchIcon:    { fontSize: 14, marginRight: 8 },
  searchInput:   { flex: 1, color: COLORS.text, fontSize: 14 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: COLORS.card,
  },
  filterChipActive: { backgroundColor: COLORS.text },
  filterText:       { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: COLORS.bg },
  filterCount: {
    fontSize: 11, color: COLORS.textDim, fontWeight: '700',
    backgroundColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1,
  },

  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80,
  },
  emptyIconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  emptyIcon:     { fontSize: 42 },
  emptyTitle:    { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: {
    fontSize: 13, color: COLORS.textMuted,
    textAlign: 'center', lineHeight: 20, paddingHorizontal: 30,
  },

  listWrap: { flex: 1 },

  // Project Card
  projectCard: {
    backgroundColor: COLORS.card, borderWidth: 1,
    borderColor: COLORS.border, borderRadius: 14, padding: 14,
    gap: 8,
  },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconBox: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  cardIconText:  { fontSize: 22 },
  projectName:   { fontSize: 15, fontWeight: '700', color: COLORS.text },
  projectChef:   { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  projectDesc:   { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  datesRow:      { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  dateText:      { fontSize: 12, color: COLORS.textMuted },
  badgesRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailsBtn: {
    marginTop: 4,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.accent + '55',
    backgroundColor: COLORS.accent + '12',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  detailsBtnText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '88%',
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
  },
  modalEyebrow: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalLoading: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    paddingBottom: 8,
    gap: 12,
  },
  modalHero: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent + '16',
    borderWidth: 1,
    borderColor: COLORS.accent + '35',
  },
  modalHeroContent: {
    flex: 1,
    minWidth: 0,
  },
  modalHeroLabel: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  modalHeroTitle: {
    color: COLORS.text,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    marginTop: 3,
  },
  modalDescription: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryPill: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  dateGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  dateBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    gap: 7,
  },
  dateIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  detailSection: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 13,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sectionTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  detailHint: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  teamName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent + '22',
    borderWidth: 1,
    borderColor: COLORS.accent + '55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  personName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  personMeta: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  memberCount: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent + '18',
    borderWidth: 1,
    borderColor: COLORS.accent + '35',
  },
  memberCountText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyMembers: {
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  detailBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  iaActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  iaActionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  iaRiskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  iaRiskTaskTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  iaRiskReason: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  iaRiskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  iaRiskBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  iaAllocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  iaAllocTask: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  iaAllocUser: {
    fontSize: 13,
    fontWeight: '800',
    maxWidth: 120,
  },
  iaApplyButton: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  iaApplyButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCreateBtn: {
    marginTop: 20,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyCreateBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  floatingAddButton: {
    bottom: 90,
    right: 20,
    borderWidth: 1,
    borderColor: COLORS.accent + '66',
  },
});
