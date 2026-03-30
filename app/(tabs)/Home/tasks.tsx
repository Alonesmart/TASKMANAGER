import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

// ─── TYPES ─────────────────────────────────────────────────────────────────────
type TaskFilter = "toutes" | "a_faire" | "en_cours" | "terminees";

type Task = {
  id:          string;
  titre:       string;
  description: string;
  projet:      string;
  assignes:    string[];
  priorite:    "faible" | "moyenne" | "haute";
  statut:      TaskFilter;
  dateDebut:   string;
  dateFin:     string;
};

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const FILTERS = [
  { id: "toutes", color: "#3b82f6" },
  { id: "a_faire", color: "#f59e0b" },
  { id: "en_cours", color: "#06b6d4" },
  { id: "terminees", color: "#ef4444" },
] as const;

const STATUT_NEXT: Record<string, TaskFilter> = {
  a_faire:   "en_cours",
  en_cours:  "terminees",
  terminees: "a_faire",
};

const T = { textSecondary: "#4a6b8a", textPrimary: "#e8f0fe" };

// ─── TASK CARD ─────────────────────────────────────────────────────────────────
const TaskCard = ({
  task,
  onChangeStatut,
  onEdit,
  onDelete,
}: {
  task: Task;
  onChangeStatut: (id: string, s: TaskFilter) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) => {
  const { t } = useTranslation();
  const PRIORITE_CONFIG = {
    faible: { label: t("tasks.priority_low"), color: "#4caf50" },
    moyenne: { label: t("tasks.priority_medium"), color: "#f5a623" },
    haute: { label: t("tasks.priority_high"), color: "#e53935" },
  };
  const STATUT_CONFIG: Record<string, { label: string; color: string }> = {
    a_faire: { label: t("tasks.status_todo"), color: "#f59e0b" },
    en_cours: { label: t("tasks.status_in_progress"), color: "#06b6d4" },
    terminees: { label: t("tasks.status_done"), color: "#ef4444" },
  };
  const prio = PRIORITE_CONFIG[task.priorite] ?? PRIORITE_CONFIG.faible;
  const statut = STATUT_CONFIG[task.statut] ?? STATUT_CONFIG.a_faire;

  return (
    <View style={cStyles.card}>
      {/* Titre + priorité */}
      <View style={cStyles.titleRow}>
        <Text style={cStyles.titre} numberOfLines={1}>{task.titre}</Text>
        <TouchableOpacity style={cStyles.editBtn} onPress={() => onEdit(task)} activeOpacity={0.8}>
          <Ionicons name="create-outline" size={14} color="#8fb7df" />
        </TouchableOpacity>
        <TouchableOpacity style={cStyles.deleteBtn} onPress={() => onDelete(task)} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={14} color="#f87171" />
        </TouchableOpacity>
        <View style={[cStyles.prioBadge, { backgroundColor: prio.color + "33", borderColor: prio.color }]}>
          <Text style={[cStyles.prioTxt, { color: prio.color }]}>{prio.label}</Text>
        </View>
      </View>

      {/* Description */}
      {!!task.description && (
        <Text style={cStyles.desc} numberOfLines={2}>{task.description}</Text>
      )}

      {/* Statut cliquable */}
      <TouchableOpacity
        style={[cStyles.statutBtn, { backgroundColor: statut.color + "22", borderColor: statut.color }]}
        onPress={() => onChangeStatut(task.id, STATUT_NEXT[task.statut] ?? "a_faire")}
        activeOpacity={0.8}
      >
        <Text style={[cStyles.statutTxt, { color: statut.color }]}>{statut.label}</Text>
        <Ionicons name="chevron-forward" size={11} color={statut.color} />
      </TouchableOpacity>

      {/* Meta */}
      <View style={cStyles.metaRow}>
        {!!task.projet && (
          <View style={cStyles.metaItem}>
            <Ionicons name="folder-outline" size={11} color="#4a6b8a" />
            <Text style={cStyles.metaTxt}>{task.projet}</Text>
          </View>
        )}
        {task.assignes.length > 0 && (
          <View style={cStyles.metaItem}>
            <Ionicons name="people-outline" size={11} color="#4a6b8a" />
            <Text style={cStyles.metaTxt}>
              {task.assignes.slice(0, 2).join(", ")}
              {task.assignes.length > 2 ? ` +${task.assignes.length - 2}` : ""}
            </Text>
          </View>
        )}
        {(!!task.dateDebut || !!task.dateFin) && (
          <View style={cStyles.metaItem}>
            <Ionicons name="calendar-outline" size={11} color="#4a6b8a" />
            <Text style={cStyles.metaTxt}>
              {task.dateDebut || "?"} → {task.dateFin || "?"}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const cStyles = StyleSheet.create({
  card: {
    backgroundColor: "#0b2239", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#2d4057", gap: 8,
  },
  titleRow:  { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  titre:     { color: "#e8f0fe", fontSize: 15, fontWeight: "700", flex: 1 },
  editBtn:   { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#1a3552" },
  deleteBtn: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#3a1f2b" },
  prioBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  prioTxt:   { fontSize: 11, fontWeight: "700" },
  statutBtn: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1,
  },
  statutTxt: { fontSize: 12, fontWeight: "600" },
  desc:      { color: "#4a6b8a", fontSize: 13, lineHeight: 18 },
  metaRow:   { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  metaItem:  { flexDirection: "row", alignItems: "center", gap: 4 },
  metaTxt:   { color: "#4a6b8a", fontSize: 11 },
});

// ─── TASKS SCREEN ──────────────────────────────────────────────────────────────
export default function Tasks() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = { bg: "#0d1117", cardBg: "#161b22", accent: "#3d8ef8", textPrimary: "#e6edf3", textSecondary: "#7d8590", border: "#21262d", logoutColor: "#f85030" };
  const styles = useMemo(() => createStyles(theme), [theme]);

  // ── Récupération des params envoyés par router.push depuis nouvelle-tache ──
  const params = useLocalSearchParams<{
    tacheCreated?:     string;
    tacheUpdated?:     string;
    tacheMode?:        string;
    tacheId?:          string;
    tacheKey?:         string;
    tacheTitre?:       string;
    tacheDescription?: string;
    tacheProjet?:      string;
    tacheAssignes?:    string;
    tachePriorite?:    string;
    tacheStatut?:      string;
    tacheDateDebut?:   string;
    tacheDateFin?:     string;
  }>();

  const [activeFilter, setActiveFilter] = useState<TaskFilter>("toutes");
  const [search, setSearch]             = useState("");
  const [tasks, setTasks]               = useState<Task[]>([]);
  const lastHandled                     = useRef<string | null>(null);
  const filters = [
    { id: "toutes" as const, label: t("tasks.filter_all"), color: "#3b82f6" },
    { id: "a_faire" as const, label: t("tasks.filter_todo"), color: "#f59e0b" },
    { id: "en_cours" as const, label: t("tasks.filter_in_progress"), color: "#06b6d4" },
    { id: "terminees" as const, label: t("tasks.filter_done"), color: "#ef4444" },
  ];

  const activeColor = filters.find(f => f.id === activeFilter)?.color ?? "#3b82f6";

  // ── Intégration de la nouvelle tâche reçue via router.push ────────────────
  useEffect(() => {
    if (!params.tacheTitre) return;
    const isCreate = params.tacheCreated === "1";
    const isUpdate = params.tacheUpdated === "1";
    if (!isCreate && !isUpdate) return;

    const sig = `${isCreate ? "create" : "update"}-${params.tacheId ?? params.tacheKey}-${params.tacheTitre}`;
    if (lastHandled.current === sig) return;
    lastHandled.current = sig;

    const incoming: Task = {
      id:          (params.tacheId ?? params.tacheKey ?? Date.now().toString()) as string,
      titre:       params.tacheTitre       as string,
      description: params.tacheDescription ?? "",
      projet:      params.tacheProjet      ?? "",
      assignes:    params.tacheAssignes    ? params.tacheAssignes.split(",").filter(Boolean) : [],
      priorite:    (params.tachePriorite   as Task["priorite"]) ?? "faible",
      statut:      (params.tacheStatut     as TaskFilter)        ?? "a_faire",
      dateDebut:   params.tacheDateDebut   ?? "",
      dateFin:     params.tacheDateFin     ?? "",
    };

    setTasks(prev => {
      if (isCreate) return [incoming, ...prev];

      let found = false;
      const updated = prev.map(task => {
        if (task.id !== incoming.id) return task;
        found = true;
        return incoming;
      });
      return found ? updated : [incoming, ...prev];
    });
  }, [
    params.tacheCreated, params.tacheKey, params.tacheTitre,
    params.tacheUpdated, params.tacheMode, params.tacheId,
    params.tacheDescription, params.tacheProjet, params.tacheAssignes,
    params.tachePriorite, params.tacheStatut,
    params.tacheDateDebut, params.tacheDateFin,
  ]);

  const handleChangeStatut = (id: string, statut: TaskFilter) =>
    setTasks(prev => prev.map(t => t.id === id ? { ...t, statut } : t));

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const filtered = tasks.filter(t => {
    const q           = search.trim().toLowerCase();
    const matchSearch = !q || t.titre.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    const matchFilter = activeFilter === "toutes" || t.statut === activeFilter;
    return matchSearch && matchFilter;
  });

  const countFor = (id: TaskFilter) =>
    id === "toutes" ? tasks.length : tasks.filter(t => t.statut === id).length;

  const handleEditTask = (task: Task) => {
    router.push({
      pathname: "/(tabs)/Home/new-tasks" as any,
      params: {
        tacheMode: "edit",
        tacheId: task.id,
        tacheTitre: task.titre,
        tacheDescription: task.description,
        tacheProjet: task.projet,
        tacheAssignes: task.assignes.join(","),
        tachePriorite: task.priorite,
        tacheStatut: task.statut,
        tacheDateDebut: task.dateDebut,
        tacheDateFin: task.dateFin,
      },
    });
  };

  const handleDeleteTask = (task: Task) => {
    Alert.alert(
      t("common.delete"),
      t("tasks.delete_confirm", { title: task.titre, defaultValue: `Supprimer "${task.titre}" ?` }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => setTasks(prev => prev.filter(item => item.id !== task.id)),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>{t("tasks.my_tasks")}</Text>
          <Text style={styles.headerTitle}>{t("tasks.title")}</Text>
        </View>
        {tasks.length > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeTxt}>{tasks.length}</Text>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#4a6b8a" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("tasks.search_placeholder")}
            placeholderTextColor="#3a5570"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#4a6b8a" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="options" size={20} color="#81746e" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {filters.map(filter => {
          const isActive = activeFilter === filter.id;
          const count    = countFor(filter.id);
          return (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.tabBtn,
                isActive && { backgroundColor: filter.color + "33", borderColor: filter.color },
              ]}
              onPress={() => setActiveFilter(filter.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabTxt, isActive && { color: filter.color, fontWeight: "700" }]}>
                {filter.label}
              </Text>
              {count > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: filter.color }]}>
                  <Text style={styles.tabBadgeTxt}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.line, { backgroundColor: activeColor }]} />

      {/* Liste ou état vide */}
      {filtered.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.circle, { backgroundColor: activeColor + "22", borderColor: activeColor, borderWidth: 1 }]}>
            <Ionicons name="clipboard" size={40} color={activeColor} />
          </View>
          <Text style={styles.emptyTitle}>{t("tasks.empty_title")}</Text>
          <Text style={styles.emptySub}>
            {search
              ? t("tasks.empty_search")
              : t("tasks.empty_default")}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 10, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onChangeStatut={handleChangeStatut}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
            />
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(tabs)/Home/new-tasks" as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const createStyles = (theme: {
  bg: string;
  cardBg: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
}) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 20 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 8, paddingBottom: 16,
  },
  eyebrow: {
    color: T.textSecondary, fontSize: 11, fontWeight: "600",
    letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 2,
  },
  headerTitle:    { color: T.textPrimary, fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  headerBadge:    { backgroundColor: theme.accent + "33", borderRadius: 12, borderWidth: 1, borderColor: theme.accent, paddingHorizontal: 10, paddingVertical: 4 },
  headerBadgeTxt: { color: theme.accent, fontWeight: "700", fontSize: 14 },

  searchRow: { flexDirection: "row", marginTop: 4, marginBottom: 4 },
  searchBox: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: theme.cardBg, borderRadius: 10, paddingHorizontal: 12, height: 42,
    borderWidth: 1, borderColor: theme.border,
  },
  searchInput: { flex: 1, color: theme.textPrimary, fontSize: 14 },
  filterBtn:   { backgroundColor: theme.cardBg, marginLeft: 10, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.border },

  tabs: { flexDirection: "row", justifyContent: "space-between", marginTop: 15, gap: 6 },
  tabBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: "transparent",
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4,
  },
  tabTxt:      { color: theme.textPrimary },
  tabBadge:    { minWidth: 16, height: 16, borderRadius: 8, justifyContent: "center", alignItems: "center", paddingHorizontal: 3 },
  tabBadgeTxt: { color: "#fff", fontSize: 9, fontWeight: "800" },

  line: { height: 1, width: "100%", marginTop: 8, marginBottom: 12, opacity: 0.9 },

  center:     { flex: 1, justifyContent: "center", alignItems: "center" },
  circle:     { width: 120, height: 120, borderRadius: 60, justifyContent: "center", alignItems: "center", marginBottom: 20 },
  emptyTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  emptySub:   { color: theme.textSecondary, textAlign: "center", lineHeight: 20 },

  fab: {
    position: "absolute", bottom: 20, right: 20,
    backgroundColor: theme.accent, width: 60, height: 60,
    borderRadius: 30, justifyContent: "center", alignItems: "center",
    elevation: 6, shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
});
