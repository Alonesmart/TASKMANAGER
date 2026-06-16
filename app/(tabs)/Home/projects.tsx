import { projectService } from '@/services/projectService';
import { userService } from '@/services/userService';
import { AppTheme, useAppTheme } from "@/theme";
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
type Project = {
  id_projet: number;
  titre: string;
  description: string | null;
  dateDebut: string;
  dateFin: string;
  statut: string;
  priorite: string;
  etat: string;
  id_administrateur: number | null;
  couleur?: string;
  icone?: string;
};

// ─── BADGE PRIORITÉ ────────────────────────────────────────────────────────────
const PrioriteBadge = ({ value, colors, badgeStyles }: { value: string; colors: ProjectColors; badgeStyles: ReturnType<typeof createBadgeStyles> }) => {
  const { t } = useTranslation();
  if (!value) return null;
  const map: Record<string, { label: string; color: string; icon: string }> = {
    haute:   { label: t("tasks.priority_high"),   color: colors.danger,  icon: '🔴' },
    moyenne: { label: t("tasks.priority_medium"), color: colors.warning, icon: '🟡' },
    basse:   { label: t("tasks.priority_low"),   color: colors.success, icon: '🟢' },
  };
  const p = map[value];
  if (!p) return null;
  return (
    <View style={[badgeStyles.badge, { borderColor: p.color }]}>
      <Text style={badgeStyles.icon}>{p.icon}</Text>
      <Text style={[badgeStyles.label, { color: p.color }]}>{p.label}</Text>
    </View>
  );
};

// ─── BADGE STATUT ──────────────────────────────────────────────────────────────
const StatutBadge = ({ value, colors, badgeStyles }: { value: string; colors: ProjectColors; badgeStyles: ReturnType<typeof createBadgeStyles> }) => {
  const { t } = useTranslation();
  if (!value) return null;
  const map: Record<string, { label: string; color: string; icon: string }> = {
    actif:   { label: t("new_project.status_active"),    color: colors.success, icon: '▶' },
    pause:   { label: t("new_project.status_paused"), color: colors.pause,   icon: '⏸' },
    termine: { label: t("new_project.status_finished"),  color: colors.accent,  icon: '✓' },
  };
  const s = map[value];
  if (!s) return null;
  return (
    <View style={[badgeStyles.badge, { borderColor: s.color, backgroundColor: s.color + '22' }]}>
      <Text style={[badgeStyles.label, { color: s.color }]}>{s.icon}  {s.label}</Text>
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
  isAdmin,
}: {
  project: Project;
  colors: ProjectColors;
  styles: ReturnType<typeof createStyles>;
  badgeStyles: ReturnType<typeof createBadgeStyles>;
  onEdit: (p: Project) => void;
  onDelete: (id: number) => void;
  isAdmin: boolean;
}) => {
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
    </View>
  );
};

// ─── PROJETS SCREEN ────────────────────────────────────────────────────────────
export default function ProjetsScreen() {
  const router = useRouter();
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

  const filters = [
    { key: 'tous',      label: t("projects.filter_all") },
    { key: 'actifs',    label: t("projects.filter_active") },
    { key: 'termine',   label: t("projects.filter_done") },
  ];

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const user = await userService.getCurrentUser();
        setIsAdmin(user?.role === 'admin');
        await fetchProjects();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

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

  // ── Filtrage par recherche + filtre statut ─────────────────────────────────
  const filteredProjects = projects.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || p.titre.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
      const matchFilter =
        activeFilter === 'tous'      ? true :
        activeFilter === 'actifs'    ? p.statut === 'actif' :
        activeFilter === 'termine'   ? p.statut === 'termine' :
        activeFilter === 'pause'     ? p.statut === 'pause' :
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
        <TouchableOpacity style={styles.filterIconBtn} activeOpacity={0.7} onPress={fetchProjects}>
          <Text style={styles.filterIconText}>🔄</Text>
        </TouchableOpacity>
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
              isAdmin={isAdmin}
            />
          ))}
        </ScrollView>
      )}
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
  filterIconBtn: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterIconText: { fontSize: 20, color: COLORS.textMuted, fontWeight: '700' },

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
});
