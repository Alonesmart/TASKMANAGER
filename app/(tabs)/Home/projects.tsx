import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from "react-i18next";
import {
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppTheme, useAppTheme } from "../../../theme";

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
  id: string;
  name: string;
  description: string;
  priorite: string;
  statut: string;
  chef: string;
  dateDebut: string;
  dateFin: string;
  couleur: string;
  icone: string;
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
}: {
  project: Project;
  colors: ProjectColors;
  styles: ReturnType<typeof createStyles>;
  badgeStyles: ReturnType<typeof createBadgeStyles>;
}) => (
  <View style={styles.projectCard}>
    {/* Top row: icone + couleur + nom */}
    <View style={styles.cardHeader}>
      <View style={[styles.cardIconBox, { backgroundColor: project.couleur || colors.border }]}>
        <Text style={styles.cardIconText}>{project.icone || '📁'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.projectName} numberOfLines={1}>{project.name}</Text>
        {!!project.chef && (
          <Text style={styles.projectChef}>👤 {project.chef}</Text>
        )}
      </View>
    </View>

    {/* Description */}
    {!!project.description && (
      <Text style={styles.projectDesc} numberOfLines={2}>{project.description}</Text>
    )}

    {/* Dates */}
    {(!!project.dateDebut || !!project.dateFin) && (
      <View style={styles.datesRow}>
        {!!project.dateDebut && (
          <Text style={styles.dateText}>📅 Début : {project.dateDebut}</Text>
        )}
        {!!project.dateFin && (
          <Text style={styles.dateText}>🏁 Fin : {project.dateFin}</Text>
        )}
      </View>
    )}

    {/* Badges */}
    {(!!project.priorite || !!project.statut) && (
      <View style={styles.badgesRow}>
        <PrioriteBadge value={project.priorite} colors={colors} badgeStyles={badgeStyles} />
        <StatutBadge value={project.statut} colors={colors} badgeStyles={badgeStyles} />
      </View>
    )}
  </View>
);

// ─── PROJETS SCREEN ────────────────────────────────────────────────────────────
export default function ProjetsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme, isDark } = useAppTheme();
  const COLORS = React.useMemo(() => createColors(theme), [theme]);
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);
  const badgeStyles = React.useMemo(() => createBadgeStyles(), []);
  const params = useLocalSearchParams<{
    created?:            string;
    key?:                string;
    projectName?:        string;
    projectDescription?: string;
    projectPriorite?:    string;
    projectStatut?:      string;
    projectChef?:        string;
    projectDateDebut?:   string;
    projectDateFin?:     string;
    projectCouleur?:     string;
    projectIcone?:       string;
  }>();

  const [activeFilter, setActiveFilter] = useState('tous');
  const [search, setSearch]             = useState('');
  const [projects, setProjects]         = useState<Project[]>([]);
  const lastHandled                     = useRef<string | null>(null);

  const filters = [
    { key: 'tous',      label: t("projects.filter_all") },
    { key: 'actifs',    label: t("projects.filter_active") },
    { key: 'terminees', label: t("projects.filter_done") },
  ];

  // ── Récupérer le nouveau projet depuis les params ──────────────────────────
  useEffect(() => {
    if (params.created === '1' && params.projectName) {
      const signature = `${params.key ?? 'no-key'}-${params.projectName}-${params.projectDescription ?? ''}`;
      if (lastHandled.current === signature) return;
      lastHandled.current = signature;

      setProjects((prev) => [
        {
          id:          params.key ?? Date.now().toString(),
          name:        params.projectName as string,
          description: params.projectDescription ?? '',
          priorite:    params.projectPriorite    ?? '',
          statut:      params.projectStatut      ?? '',
          chef:        params.projectChef        ?? '',
          dateDebut:   params.projectDateDebut   ?? '',
          dateFin:     params.projectDateFin     ?? '',
          couleur:     params.projectCouleur     ?? '',
          icone:       params.projectIcone       ?? '',
        },
        ...prev,
      ]);
    }
  }, [
    params.created, params.key,
    params.projectName, params.projectDescription,
    params.projectPriorite, params.projectStatut,
    params.projectChef, params.projectDateDebut,
    params.projectDateFin, params.projectCouleur, params.projectIcone,
  ]);

  // ── Filtrage par recherche + filtre statut ─────────────────────────────────
  const filteredProjects = projects.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    const matchFilter =
      activeFilter === 'tous'      ? true :
      activeFilter === 'actifs'    ? p.statut === 'actif' :
      activeFilter === 'terminees' ? p.statut === 'termine' :
      true;
    return matchSearch && matchFilter;
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t("projects.title")}</Text>
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
        <TouchableOpacity style={styles.filterIconBtn} activeOpacity={0.7}>
          <Text style={styles.filterIconText}>≡</Text>
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
                  f.key === 'terminees' ? p.statut === 'termine' : true
                ).length}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* List or Empty */}
      {filteredProjects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIcon}>📁</Text>
          </View>
          <Text style={styles.emptyTitle}>{t("projects.empty_title")}</Text>
          <Text style={styles.emptySubtitle}>
            {t("projects.empty_subtitle")}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listWrap}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {filteredProjects.map((p) => (
            <ProjectCard key={p.id} project={p} colors={COLORS} styles={styles} badgeStyles={badgeStyles} />
          ))}
        </ScrollView>
      )}
      <TouchableOpacity
          style={styles.addButton}
                   onPress={() => router.push("/(tabs)/Home/new-projet")}
          activeOpacity={0.85}

        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
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
  addButton: {
  marginTop: 14,
  alignSelf: "flex-end",
  marginRight: 30,
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: COLORS.accent,
  justifyContent: "center",
  alignItems: "center",
  },
  addButtonText: { fontSize: 28, color: '#fff', fontWeight: '300', lineHeight: 32, marginTop: -2 },

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
});
