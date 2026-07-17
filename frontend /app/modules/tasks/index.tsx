import { projectService } from "@/services/projectService";
import { taskService, type Task, type HistoriqueValidationTache } from "@/services/taskService";
import { userService } from "@/services/userService";
import { useAppTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import DocumentSection from "../../../components/DocumentSection";
import * as DocumentPicker from "expo-document-picker";
import { documentService } from "@/services/documentService";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
  ActivityIndicator
} from "react-native";
import AddButton from "../../../components/AddButton";

// ─── TYPES ─────────────────────────────────────────────────────────────────────
type TaskFilter = "toutes" | "a_faire" | "en_cours" | "terminee_en_attente" | "terminees";

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const FILTERS = [
  { id: "toutes", color: "#3b82f6" },
  { id: "a_faire", color: "#f59e0b" },
  { id: "en_cours", color: "#06b6d4" },
  { id: "terminee_en_attente", color: "#a855f7" },
  { id: "terminees", color: "#ef4444" },
] as const;

const STATUT_NEXT: Record<string, string> = {
  a_faire:   "en_cours",
  en_cours:  "terminee_en_attente",
  terminee_en_attente: "terminees",
  terminees: "a_faire",
};

// ─── TASK CARD ─────────────────────────────────────────────────────────────────
const TaskCard = ({
  task,
  onChangeStatut,
  onDetails,
  onEdit,
  onDelete,
  canEditDelete,
  canValidate,
}: {
  task: Task;
  onChangeStatut: (id: number, s: string) => void;
  onDetails: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  canEditDelete: boolean;
  canValidate: boolean;
}) => {
  const { t } = useTranslation();
  const PRIORITE_CONFIG: Record<string, { label: string; color: string }> = {
    faible: { label: t("tasks.priority_low"), color: "#4caf50" },
    moyenne: { label: t("tasks.priority_medium"), color: "#f5a623" },
    haute: { label: t("tasks.priority_high"), color: "#e53935" },
  };
  const STATUT_CONFIG: Record<string, { label: string; color: string }> = {
    a_faire: { label: t("tasks.status_todo"), color: "#f59e0b" },
    en_cours: { label: t("tasks.status_in_progress"), color: "#06b6d4" },
    terminee_en_attente: { label: "À valider", color: "#a855f7" },
    terminees: { label: t("tasks.status_done"), color: "#ef4444" },
  };
  const prio = PRIORITE_CONFIG[task.priorite] ?? PRIORITE_CONFIG.moyenne;
  const statut = STATUT_CONFIG[task.statut] ?? STATUT_CONFIG.a_faire;

  return (
    <View style={cStyles.card}>
      {/* Titre + priorité */}
      <View style={cStyles.titleRow}>
        <Text style={cStyles.titre} numberOfLines={1}>{task.titre}</Text>
        {canEditDelete && (
          <>
            <TouchableOpacity style={cStyles.editBtn} onPress={() => onEdit(task)} activeOpacity={0.8}>
              <Ionicons name="create-outline" size={14} color="#8fb7df" />
            </TouchableOpacity>
            <TouchableOpacity style={cStyles.deleteBtn} onPress={() => onDelete(task)} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={14} color="#f87171" />
            </TouchableOpacity>
          </>
        )}
        <View style={[cStyles.prioBadge, { backgroundColor: prio.color + "33", borderColor: prio.color }]}>
          <Text style={[cStyles.prioTxt, { color: prio.color }]}>{prio.label}</Text>
        </View>
      </View>

      {/* Description */}
      {!!task.description && (
        <Text style={cStyles.desc} numberOfLines={2}>{task.description}</Text>
      )}

      {/* Statut cliquable */}
      {(() => {
        const isClickable = task.statut !== "terminees" && (task.statut !== "terminee_en_attente" || canValidate);
        return (
          <TouchableOpacity
            style={[cStyles.statutBtn, { backgroundColor: statut.color + "22", borderColor: statut.color }]}
            onPress={() => isClickable && onChangeStatut(task.id_tache, STATUT_NEXT[task.statut] ?? "a_faire")}
            activeOpacity={isClickable ? 0.8 : 1}
            disabled={!isClickable}
          >
            <Text style={[cStyles.statutTxt, { color: statut.color }]}>{statut.label}</Text>
            {isClickable && <Ionicons name="chevron-forward" size={11} color={statut.color} />}
          </TouchableOpacity>
        );
      })()}

      {/* Meta */}
      <View style={cStyles.metaRow}>
        <View style={cStyles.metaItem}>
          <Ionicons name="folder-outline" size={11} color="#4a6b8a" />
          <Text style={cStyles.metaTxt}>{task.projet?.titre || `Projet ID: ${task.id_projet}`}</Text>
        </View>
        {!!task.echeance && (
          <View style={cStyles.metaItem}>
            <Ionicons name="calendar-outline" size={11} color="#4a6b8a" />
            <Text style={cStyles.metaTxt}>
              Échéance: {new Date(task.echeance).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={cStyles.detailsBtn} onPress={() => onDetails(task)} activeOpacity={0.8}>
        <Ionicons name="information-circle-outline" size={16} color="#8fb7df" />
        <Text style={cStyles.detailsBtnText}>Détails</Text>
      </TouchableOpacity>
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
  detailsBtn: {
    marginTop: 4,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3d6b95",
    backgroundColor: "#14304d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  detailsBtnText: { color: "#8fb7df", fontSize: 13, fontWeight: "700" },
});

// ─── TASKS SCREEN ──────────────────────────────────────────────────────────────
export default function Tasks() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [activeFilter, setActiveFilter] = useState<TaskFilter>("toutes");
  const [search, setSearch]             = useState("");
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [loading, setLoading]           = useState(true);
  const [isAdmin, setIsAdmin]           = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [viewMode, setViewMode] = useState<"list" | "kanban" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"mine" | "to_validate">("mine");
  const [tasksToValidate, setTasksToValidate] = useState<Task[]>([]);
  const [taskHistory, setTaskHistory] = useState<HistoriqueValidationTache[]>([]);

  // Submission
  const [submissionVisible, setSubmissionVisible] = useState(false);
  const [submissionTask, setSubmissionTask] = useState<Task | null>(null);
  const [proofText, setProofText] = useState("");
  const [proofDoc, setProofDoc] = useState<any | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);

  // Validation
  const [validationVisible, setValidationVisible] = useState(false);
  const [validationTask, setValidationTask] = useState<Task | null>(null);
  const [validationComment, setValidationComment] = useState("");
  const [validatingTask, setValidatingTask] = useState(false);

  // Rejection
  const [rejectionVisible, setRejectionVisible] = useState(false);
  const [rejectionTask, setRejectionTask] = useState<Task | null>(null);
  const [rejectionComment, setRejectionComment] = useState("");
  const [rejectingTask, setRejectingTask] = useState(false);

  const filters = [
    { id: "toutes" as const, label: t("tasks.filter_all"), color: "#3b82f6" },
    { id: "a_faire" as const, label: t("tasks.filter_todo"), color: "#f59e0b" },
    { id: "en_cours" as const, label: t("tasks.filter_in_progress"), color: "#06b6d4" },
    { id: "terminee_en_attente" as const, label: "À valider", color: "#a855f7" },
    { id: "terminees" as const, label: t("tasks.filter_done"), color: "#ef4444" },
  ];

  const activeColor = filters.find(f => f.id === activeFilter)?.color ?? "#3b82f6";

  useEffect(() => {
    const init = async () => {
      try {
        const user = await userService.getCurrentUser();
        setIsAdmin(user?.role === "admin");
        setCurrentUserId(user?.id || null);
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
      fetchTasks();
    };
    init();
  }, [isFocused]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const user = await userService.getCurrentUser();
      const currentUid = user?.id;
      const isUserAdmin = user?.role === "admin";

      const data = await projectService.getTasks();
      setTasks(data);

      const toVal: Task[] = [];
      const cache: Record<number, any[]> = {};
      const invitationService = require("../../../services/invitationService").invitationService;

      for (const t of data) {
        if (t.statut === "terminee_en_attente") {
          let canVal = false;
          if (isUserAdmin) {
            canVal = true;
          } else if (t.projet?.id_administrateur === currentUid) {
            canVal = true;
          } else {
            try {
              if (!cache[t.id_projet]) {
                const members = await invitationService.getProjectMembers(t.id_projet);
                cache[t.id_projet] = members;
              }
              const userInProject = cache[t.id_projet].find((m: any) => m.id === currentUid);
              if (userInProject?.role === "chef_projet") {
                canVal = true;
              }
            } catch (err) {
              console.error("Error checking project role", err);
            }
          }
          if (canVal) {
            toVal.push(t);
          }
        }
      }
      setTasksToValidate(toVal);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatut = async (id: number, statut: string) => {
    const task = tasks.find((t) => t.id_tache === id);
    if (!task) return;

    if (statut === "terminee_en_attente") {
      setSubmissionTask(task);
      setProofText("");
      setProofDoc(null);
      setSubmissionVisible(true);
      return;
    }

    if (statut === "terminees") {
      if (task.statut === "terminee_en_attente") {
        setValidationTask(task);
        setValidationComment("");
        setValidationVisible(true);
        return;
      }
      
      const user = await userService.getCurrentUser();
      const isUserAdmin = user?.role === "admin";
      const isChef = task.projet?.id_administrateur === user?.id;
      
      if (isUserAdmin || isChef) {
        try {
          await projectService.updateTask(id, { statut });
          await fetchTasks();
          
          Alert.alert(
            t("tasks.completion_alert_title", "Tâche terminée !"),
            t("tasks.completion_alert_desc", "Voulez-vous rédiger le rapport de complétion de cette tâche ?"),
            [
              { text: t("common.no", "Plus tard"), style: "cancel" },
              {
                text: t("common.yes", "Rédiger"),
                onPress: () => {
                  router.push({
                    pathname: "/(tabs)/Home/new-report",
                    params: {
                      id_projet: task?.id_projet?.toString(),
                      id_tache: task?.id_tache?.toString(),
                      titre_tache: task?.titre,
                    },
                  });
                },
              },
            ]
          );
        } catch (error) {
          console.error(error);
          Alert.alert("Erreur", "Impossible de terminer la tâche.");
        }
      } else {
        setSubmissionTask(task);
        setProofText("");
        setProofDoc(null);
        setSubmissionVisible(true);
      }
      return;
    }

    if (statut === "en_cours" && task.statut === "terminee_en_attente") {
      setRejectionTask(task);
      setRejectionComment("");
      setRejectionVisible(true);
      return;
    }

    try {
      await projectService.updateTask(id, { statut });
      await fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      Alert.alert(t("common.error"), "Impossible de mettre à jour le statut");
    }
  };

  const handleConfirmSubmission = async () => {
    if (!submissionTask) return;
    setSubmittingProof(true);
    try {
      await taskService.soumettreTacheTerminee(submissionTask.id_tache, {
        preuve_texte: proofText,
        id_document_preuve: proofDoc?.id || null,
      });
      Alert.alert("Succès", "Tâche soumise pour validation !");
      setSubmissionVisible(false);
      setSubmissionTask(null);
      await fetchTasks();
    } catch (error) {
      console.error("Error submitting task:", error);
      Alert.alert("Erreur", "Impossible de soumettre la tâche");
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleConfirmValidation = async () => {
    if (!validationTask) return;
    setValidatingTask(true);
    try {
      await taskService.validerTache(validationTask.id_tache, {
        commentaire: validationComment,
      });
      Alert.alert("Succès", "Tâche validée !");
      setValidationVisible(false);
      setValidationTask(null);
      await fetchTasks();
      
      Alert.alert(
        t("tasks.completion_alert_title", "Tâche terminée !"),
        t("tasks.completion_alert_desc", "Voulez-vous rédiger le rapport de complétion de cette tâche ?"),
        [
          { text: t("common.no", "Plus tard"), style: "cancel" },
          {
            text: t("common.yes", "Rédiger"),
            onPress: () => {
              router.push({
                pathname: "/(tabs)/Home/new-report",
                params: {
                  id_projet: validationTask?.id_projet?.toString(),
                  id_tache: validationTask?.id_tache?.toString(),
                  titre_tache: validationTask?.titre,
                },
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error validating task:", error);
      Alert.alert("Erreur", "Impossible de valider la tâche");
    } finally {
      setValidatingTask(false);
    }
  };

  const handleConfirmRejection = async () => {
    if (!rejectionTask) return;
    if (!rejectionComment.trim()) {
      Alert.alert("Erreur", "Veuillez saisir un motif pour le rejet.");
      return;
    }
    setRejectingTask(true);
    try {
      await taskService.rejeterTache(rejectionTask.id_tache, {
        commentaire: rejectionComment,
      });
      Alert.alert("Tâche rejetée", "La tâche a été renvoyée en cours avec votre motif.");
      setRejectionVisible(false);
      setRejectionTask(null);
      await fetchTasks();
    } catch (error) {
      console.error("Error rejecting task:", error);
      Alert.alert("Erreur", "Impossible de rejeter la tâche");
    } finally {
      setRejectingTask(false);
    }
  };


  // ── Filtrage ──────────────────────────────────────────────────────────────
  const currentSourceTasks = activeTab === "mine" ? tasks : tasksToValidate;
  const filtered = currentSourceTasks.filter(t => {
    const q           = search.trim().toLowerCase();
    const matchSearch = !q || t.titre.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q));
    const matchFilter = activeTab === "to_validate" || activeFilter === "toutes" || t.statut === activeFilter;
    return matchSearch && matchFilter;
  });

  const countFor = (id: TaskFilter) =>
    id === "toutes" ? tasks.length : tasks.filter(t => t.statut === id).length;

  const handleEditTask = (task: Task) => {
    router.push({
      pathname: "/(tabs)/Home/new-tasks" as any,
      params: {
        tacheMode: "edit",
        tacheId: task.id_tache.toString(),
        tacheTitre: task.titre,
        tacheDescription: task.description ?? "",
        tacheProjet: task.id_projet.toString(),
        tachePriorite: task.priorite,
        tacheStatut: task.statut,
        tacheDateFin: task.echeance ?? "",
        tacheAssignes: (task.assigned_users ?? []).map((user) => user.id).join(","),
      },
    });
  };

  const handleDetailsTask = async (task: Task) => {
    setSelectedTask(task);
    setDetailsVisible(true);
    setTaskHistory([]);
    try {
      const hist = await taskService.getHistoriqueValidationTache(task.id_tache);
      setTaskHistory(hist);
    } catch (e) {
      console.log("Failed to load validation history for task:", e);
    }
  };

  const getDaysInMonth = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;
    
    const numDays = lastDay.getDate();
    const days: (Date | null)[] = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= numDays; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const isSameDayStr = (d1: Date, d2Str: string | null) => {
    if (!d2Str) return false;
    const y = d1.getFullYear();
    const m = String(d1.getMonth() + 1).padStart(2, "0");
    const d = String(d1.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}` === d2Str;
  };

  const formatTaskDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return Number.isNaN(date.getTime()) ? dateStr : date.toLocaleDateString();
  };

  const getPriorityMeta = (priority?: string) => {
    const map: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
      faible: { label: t("tasks.priority_low"), color: "#4caf50", icon: "leaf-outline" },
      moyenne: { label: t("tasks.priority_medium"), color: "#f5a623", icon: "flag-outline" },
      haute: { label: t("tasks.priority_high"), color: "#e53935", icon: "alert-circle-outline" },
    };
    return map[priority || ""] ?? map.moyenne;
  };

  const getStatusMeta = (status?: string) => {
    const map: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
      a_faire: { label: t("tasks.status_todo"), color: "#f59e0b", icon: "ellipse-outline" },
      en_cours: { label: t("tasks.status_in_progress"), color: "#06b6d4", icon: "time-outline" },
      terminee_en_attente: { label: "À valider", color: "#a855f7", icon: "hourglass-outline" },
      terminees: { label: t("tasks.status_done"), color: "#ef4444", icon: "checkmark-circle-outline" },
    };
    return map[status || ""] ?? map.a_faire;
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
          onPress: async () => {
            try {
              await projectService.deleteTask(task.id_tache);
              setTasks(prev => prev.filter(item => item.id_tache !== task.id_tache));
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert(t("common.error"), "Impossible de supprimer la tâche");
            }
          },
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

      {/* Mes tâches vs À valider Tab Bar */}
      {(isAdmin || tasksToValidate.length > 0) && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "mine" && styles.tabButtonActive]}
            onPress={() => {
              setActiveTab("mine");
            }}
          >
            <Ionicons name="clipboard-outline" size={16} color={activeTab === "mine" ? "#fff" : theme.textSecondary} />
            <Text style={[styles.tabButtonText, activeTab === "mine" && styles.tabButtonTextActive]}>
              Mes tâches
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "to_validate" && styles.tabButtonActive]}
            onPress={() => {
              setActiveTab("to_validate");
            }}
          >
            <Ionicons name="checkmark-done-circle-outline" size={16} color={activeTab === "to_validate" ? "#fff" : theme.textSecondary} />
            <Text style={[styles.tabButtonText, activeTab === "to_validate" && styles.tabButtonTextActive]}>
              À valider ({tasksToValidate.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

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

      {/* Segmented Control for View Mode */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity 
          style={[styles.viewModeBtn, viewMode === "list" && styles.viewModeBtnActive]} 
          onPress={() => setViewMode("list")}
          activeOpacity={0.8}
        >
          <Ionicons name="list-outline" size={16} color={viewMode === "list" ? "#fff" : theme.textSecondary} />
          <Text style={[styles.viewModeBtnText, viewMode === "list" && styles.viewModeBtnTextActive]}>
            Liste
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.viewModeBtn, viewMode === "kanban" && styles.viewModeBtnActive]} 
          onPress={() => setViewMode("kanban")}
          activeOpacity={0.8}
        >
          <Ionicons name="apps-outline" size={16} color={viewMode === "kanban" ? "#fff" : theme.textSecondary} />
          <Text style={[styles.viewModeBtnText, viewMode === "kanban" && styles.viewModeBtnTextActive]}>
            Kanban
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.viewModeBtn, viewMode === "calendar" && styles.viewModeBtnActive]} 
          onPress={() => setViewMode("calendar")}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={16} color={viewMode === "calendar" ? "#fff" : theme.textSecondary} />
          <Text style={[styles.viewModeBtnText, viewMode === "calendar" && styles.viewModeBtnTextActive]}>
            Calendrier
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs (Only in List View AND only for mine tab) */}
      {viewMode === "list" && activeTab === "mine" && (
        <>
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
        </>
      )}

      {/* Main Views */}
      {viewMode === "list" && (
        filtered.length === 0 ? (
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
                key={task.id_tache}
                task={task}
                onChangeStatut={handleChangeStatut}
                onDetails={handleDetailsTask}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                canEditDelete={isAdmin}
                canValidate={tasksToValidate.some(t => t.id_tache === task.id_tache)}
              />
            ))}
          </ScrollView>
        )
      )}

      {viewMode === "kanban" && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kanbanScrollContent}
        >
          {["a_faire", "en_cours", "terminee_en_attente", "terminees"].map(status => {
            const columnTasks = filtered.filter(t => t.statut === status);
            const statusMeta = getStatusMeta(status);
            return (
              <View key={status} style={styles.kanbanColumn}>
                <View style={styles.kanbanColumnHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name={statusMeta.icon} size={18} color={statusMeta.color} />
                    <Text style={styles.kanbanColumnTitle}>{statusMeta.label}</Text>
                  </View>
                  <View style={[styles.kanbanBadge, { backgroundColor: statusMeta.color }]}>
                    <Text style={styles.kanbanBadgeText}>{columnTasks.length}</Text>
                  </View>
                </View>
                <ScrollView 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.kanbanColumnList}
                >
                  {columnTasks.length === 0 ? (
                    <View style={styles.kanbanEmpty}>
                      <Text style={styles.kanbanEmptyText}>Aucune tâche</Text>
                    </View>
                  ) : (
                    columnTasks.map(task => {
                      const canValidate = tasksToValidate.some(t => t.id_tache === task.id_tache);
                      return (
                        <View key={task.id_tache} style={styles.kanbanCard}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.kanbanCardTitle} numberOfLines={1}>{task.titre}</Text>
                            {!!task.description && (
                              <Text style={styles.kanbanCardDesc} numberOfLines={2}>{task.description}</Text>
                            )}
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                              <Text style={styles.kanbanCardDate}>{formatTaskDate(task.echeance)}</Text>
                              
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                {status !== "a_faire" && (status !== "terminee_en_attente" || canValidate) && (
                                  <TouchableOpacity 
                                    style={styles.kanbanMoveBtn}
                                    onPress={() => handleChangeStatut(task.id_tache, status === "terminees" ? "en_cours" : (status === "terminee_en_attente" ? "en_cours" : "a_faire"))}
                                  >
                                    <Ionicons name="arrow-back-outline" size={14} color={theme.textPrimary} />
                                  </TouchableOpacity>
                                )}
                                
                                <TouchableOpacity 
                                  style={styles.kanbanDetailsBtn}
                                  onPress={() => handleDetailsTask(task)}
                                >
                                  <Ionicons name="eye-outline" size={14} color={theme.accent} />
                                </TouchableOpacity>

                                {status !== "terminees" && (status !== "terminee_en_attente" || canValidate) && (
                                  <TouchableOpacity 
                                    style={styles.kanbanMoveBtn}
                                    onPress={() => handleChangeStatut(task.id_tache, status === "a_faire" ? "en_cours" : (status === "en_cours" ? "terminee_en_attente" : "terminees"))}
                                  >
                                    <Ionicons name="arrow-forward-outline" size={14} color={theme.textPrimary} />
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      )}

      {viewMode === "calendar" && (
        <View style={{ flex: 1 }}>
          {/* Calendar Card */}
          <View style={styles.calendarCard}>
            {/* Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={handlePrevMonth}>
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.calendarMonthTitle}>
                {currentMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" }).toUpperCase()}
              </Text>
              <TouchableOpacity onPress={handleNextMonth}>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Days of Week labels */}
            <View style={styles.calendarWeekdays}>
              {["L", "M", "M", "J", "V", "S", "D"].map((day, idx) => (
                <Text key={idx} style={styles.calendarWeekdayText}>{day}</Text>
              ))}
            </View>

            {/* Grid of days */}
            <View style={styles.calendarGrid}>
              {getDaysInMonth(currentMonth).map((day, idx) => {
                if (!day) return <View key={`empty-${idx}`} style={styles.calendarDayCell} />;
                
                const isSelected = selectedDate.toDateString() === day.toDateString();
                const isToday = new Date().toDateString() === day.toDateString();
                const dayTasks = tasks.filter(t => isSameDayStr(day, t.echeance));
                
                return (
                  <TouchableOpacity 
                    key={idx} 
                    style={[
                      styles.calendarDayCell,
                      isToday && styles.calendarDayToday,
                      isSelected && styles.calendarDaySelected,
                      isSelected && { backgroundColor: theme.accent }
                    ]}
                    onPress={() => setSelectedDate(day)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.calendarDayText,
                      isSelected && styles.calendarDayTextSelected,
                      isToday && !isSelected && { color: theme.accent, fontWeight: "bold" }
                    ]}>
                      {day.getDate()}
                    </Text>
                    {dayTasks.length > 0 && (
                      <View style={styles.calendarDotsRow}>
                        {dayTasks.slice(0, 3).map((t, tIdx) => {
                          const prioColor = getPriorityMeta(t.priorite).color;
                          return (
                            <View 
                              key={tIdx} 
                              style={[styles.calendarDot, { backgroundColor: prioColor }]} 
                            />
                          );
                        })}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Tasks List below calendar */}
          <View style={{ flex: 1, marginTop: 12 }}>
            <View style={styles.calendarTasksHeader}>
              <Ionicons name="calendar-outline" size={16} color={theme.accent} />
              <Text style={styles.calendarTasksTitle}>
                Tâches pour le {selectedDate.toLocaleDateString()}
              </Text>
            </View>

            {(() => {
              const selectedTasks = filtered.filter(t => isSameDayStr(selectedDate, t.echeance));
              return selectedTasks.length === 0 ? (
                <View style={styles.calendarTasksEmpty}>
                  <Text style={styles.calendarTasksEmptyText}>Aucune tâche pour cette date</Text>
                </View>
              ) : (
                <ScrollView 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingBottom: 100 }}
                >
                  {selectedTasks.map(task => (
                    <TaskCard
                      key={task.id_tache}
                      task={task}
                      onChangeStatut={handleChangeStatut}
                      onDetails={handleDetailsTask}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      canEditDelete={isAdmin}
                      canValidate={tasksToValidate.some(t => t.id_tache === task.id_tache)}
                    />
                  ))}
                </ScrollView>
              );
            })()}
          </View>
        </View>
      )}

      {isAdmin && (
        <AddButton
          onPress={() => router.push("/(tabs)/Home/new-tasks")}
          backgroundColor={theme.accent}
          accessibilityLabel="Ajouter une tâche"
          shadowColor={theme.accent}
          size={56}
          iconSize={32}
          style={styles.floatingAddButton}
        />
      )}

      <Modal
        visible={detailsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalEyebrow}>Détail de la tâche</Text>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {selectedTask?.titre || "Tâche"}
                </Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailsVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedTask && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                <View style={styles.modalHero}>
                  <View style={styles.modalHeroIcon}>
                    <Ionicons name="clipboard-outline" size={26} color={theme.accent} />
                  </View>
                  <View style={styles.modalHeroContent}>
                    <Text style={styles.modalHeroLabel}>Nom de la tâche</Text>
                    <Text style={styles.modalHeroTitle} numberOfLines={2}>{selectedTask.titre}</Text>
                    {!!selectedTask.description && (
                      <Text style={styles.modalDescription}>{selectedTask.description}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.summaryRow}>
                  {(() => {
                    const status = getStatusMeta(selectedTask.statut);
                    const priority = getPriorityMeta(selectedTask.priorite);
                    return (
                      <>
                        <View style={[styles.summaryPill, { borderColor: status.color + "55", backgroundColor: status.color + "14" }]}>
                          <Ionicons name={status.icon} size={16} color={status.color} />
                          <Text style={[styles.summaryPillText, { color: status.color }]}>{status.label}</Text>
                        </View>
                        <View style={[styles.summaryPill, { borderColor: priority.color + "55", backgroundColor: priority.color + "14" }]}>
                          <Ionicons name={priority.icon} size={16} color={priority.color} />
                          <Text style={[styles.summaryPillText, { color: priority.color }]}>{priority.label}</Text>
                        </View>
                      </>
                    );
                  })()}
                </View>

                <View style={styles.detailGrid}>
                  <View style={styles.detailBox}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="folder-outline" size={16} color={theme.accent} />
                    </View>
                    <Text style={styles.detailLabel}>Projet</Text>
                    <Text style={styles.detailValue} numberOfLines={2}>
                      {selectedTask.projet?.titre || `Projet ID: ${selectedTask.id_projet}`}
                    </Text>
                  </View>
                  <View style={styles.detailBox}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="calendar-outline" size={16} color="#f5a623" />
                    </View>
                    <Text style={styles.detailLabel}>Échéance</Text>
                    <Text style={styles.detailValue}>{formatTaskDate(selectedTask.echeance)}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="people-outline" size={18} color={theme.accent} />
                    <Text style={styles.sectionTitle}>Personnes assignées</Text>
                  </View>
                  {(selectedTask.assigned_users ?? []).length === 0 ? (
                    <Text style={styles.detailHint}>Aucune personne assignée.</Text>
                  ) : (
                    (selectedTask.assigned_users ?? []).map((user) => (
                      <View key={user.id} style={styles.personRow}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{user.nom?.charAt(0).toUpperCase() || "?"}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.personName}>{user.nom}</Text>
                          {!!user.email && <Text style={styles.personMeta}>{user.email}</Text>}
                        </View>
                      </View>
                    ))
                  )}
                </View>

                <View style={styles.detailSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="link-outline" size={18} color={theme.accent} />
                    <Text style={styles.sectionTitle}>Dépendances (Tâches préalables)</Text>
                  </View>
                  {(!selectedTask.dependencies || selectedTask.dependencies.length === 0) ? (
                    <Text style={styles.detailHint}>Aucune dépendance requise.</Text>
                  ) : (
                    selectedTask.dependencies.map((dep: any) => {
                      const depStatus = getStatusMeta(dep.statut);
                      return (
                        <View key={dep.id_tache} style={styles.personRow}>
                          <View style={[styles.avatar, { backgroundColor: depStatus.color + "22", borderColor: depStatus.color }]}>
                            <Ionicons name={depStatus.icon} size={16} color={depStatus.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.personName}>{dep.titre}</Text>
                            <Text style={[styles.personMeta, { color: depStatus.color }]}>{depStatus.label}</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                <View style={styles.detailSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="analytics-outline" size={18} color={theme.accent} />
                    <Text style={styles.sectionTitle}>Progression</Text>
                    <Text style={styles.progressText}>{selectedTask.progression}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${selectedTask.progression}%`, backgroundColor: theme.accent }]} />
                  </View>
                </View>

                {/* Motif du rejet si présent */}
                {selectedTask.commentaire_rejet && (
                  <View style={[styles.detailSection, { borderColor: "#ef444455", backgroundColor: "#ef444410" }]}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
                      <Text style={[styles.sectionTitle, { color: "#ef4444" }]}>Motif du rejet</Text>
                    </View>
                    <Text style={{ color: "#ef4444", fontSize: 13, lineHeight: 18 }}>
                      "{selectedTask.commentaire_rejet}"
                    </Text>
                  </View>
                )}

                {/* Preuve de réalisation si présente */}
                {(selectedTask.preuve_texte || selectedTask.id_document_preuve) && (
                  <View style={styles.detailSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="shield-checkmark-outline" size={18} color={theme.accent} />
                      <Text style={styles.sectionTitle}>Preuve de réalisation</Text>
                    </View>
                    {selectedTask.preuve_texte && (
                      <Text style={{ color: theme.textPrimary, fontSize: 13, lineHeight: 18, marginBottom: 8 }}>
                        {selectedTask.preuve_texte}
                      </Text>
                    )}
                    {selectedTask.id_document_preuve && (
                      <TouchableOpacity
                        style={[styles.proofDocBtn, { backgroundColor: theme.bg, borderColor: theme.border }]}
                        onPress={() => {
                          const url = documentService.getDownloadUrl(selectedTask.id_document_preuve!);
                          Linking.openURL(url);
                        }}
                      >
                        <Ionicons name="document-text-outline" size={16} color={theme.accent} />
                        <Text style={{ color: theme.accent, fontSize: 13, fontWeight: "600" }}>
                          Voir le document de preuve
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Actions de validation pour le chef/admin */}
                {selectedTask.statut === "terminee_en_attente" && tasksToValidate.some(t => t.id_tache === selectedTask.id_tache) && (
                  <View style={[styles.detailSection, { borderColor: theme.accent + "55" }]}>
                    <Text style={[styles.sectionTitle, { marginBottom: 6 }]}>Décision de validation</Text>
                    <TextInput
                      style={[styles.validationInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.cardBg }]}
                      placeholder="Commentaire ou remarques (obligatoire si rejet)..."
                      placeholderTextColor={theme.textSecondary}
                      value={validationComment}
                      onChangeText={setValidationComment}
                      multiline
                    />
                    <View style={styles.btnRow}>
                      <TouchableOpacity
                        style={[styles.rejectBtn, validatingTask && { opacity: 0.7 }]}
                        onPress={async () => {
                          if (!validationComment.trim()) {
                            Alert.alert("Information", "Veuillez saisir un commentaire expliquant le motif du rejet.");
                            return;
                          }
                          setValidatingTask(true);
                          try {
                            await taskService.rejeterTache(selectedTask.id_tache, { commentaire: validationComment });
                            Alert.alert("Tâche rejetée", "La tâche a été renvoyée en cours avec votre motif.");
                            setDetailsVisible(false);
                            await fetchTasks();
                          } catch (e) {
                            console.error(e);
                            Alert.alert("Erreur", "Impossible de rejeter la tâche");
                          } finally {
                            setValidatingTask(false);
                          }
                        }}
                        disabled={validatingTask}
                      >
                        <Ionicons name="close-circle" size={18} color="#fff" />
                        <Text style={styles.btnText}>Rejeter</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.validateBtn, validatingTask && { opacity: 0.7 }]}
                        onPress={async () => {
                          setValidatingTask(true);
                          try {
                            await taskService.validerTache(selectedTask.id_tache, { commentaire: validationComment });
                            Alert.alert("Succès", "Tâche validée !");
                            setDetailsVisible(false);
                            await fetchTasks();
                            
                            Alert.alert(
                              t("tasks.completion_alert_title", "Tâche terminée !"),
                              t("tasks.completion_alert_desc", "Voulez-vous rédiger le rapport de complétion de cette tâche ?"),
                              [
                                { text: t("common.no", "Plus tard"), style: "cancel" },
                                {
                                  text: t("common.yes", "Rédiger"),
                                  onPress: () => {
                                    router.push({
                                      pathname: "/(tabs)/Home/new-report",
                                      params: {
                                        id_projet: selectedTask?.id_projet?.toString(),
                                        id_tache: selectedTask?.id_tache?.toString(),
                                        titre_tache: selectedTask?.titre,
                                      },
                                    });
                                  },
                                },
                              ]
                            );
                          } catch (e) {
                            console.error(e);
                            Alert.alert("Erreur", "Impossible de valider la tâche");
                          } finally {
                            setValidatingTask(false);
                          }
                        }}
                        disabled={validatingTask}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.btnText}>Valider</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Historique Timeline */}
                {taskHistory.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Suivi du cycle de validation</Text>
                    <View style={styles.timelineContainer}>
                      {taskHistory.map((h, index) => {
                        const isLast = index === taskHistory.length - 1;
                        const statusCfg = getStatusMeta(h.nouveau_statut);
                        return (
                          <View key={h.id_historique} style={styles.timelineRow}>
                            <View style={styles.timelineLeft}>
                              <View style={[styles.timelineDot, { backgroundColor: statusCfg.color }]} />
                              {!isLast && <View style={styles.timelineLine} />}
                            </View>
                            <View style={styles.timelineRight}>
                              <View style={styles.timelineHeader}>
                                <Text style={[styles.timelineStatus, { color: statusCfg.color }]}>
                                  {statusCfg.label.toUpperCase()}
                                </Text>
                                <Text style={styles.timelineDate}>
                                  {new Date(h.date).toLocaleDateString()}
                                </Text>
                              </View>
                              {h.commentaire && (
                                <Text style={styles.timelineComment}>
                                  Note : {h.commentaire}
                                </Text>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                <DocumentSection idTache={selectedTask.id_tache} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Submission Modal ── */}
      <Modal
        visible={submissionVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSubmissionVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalEyebrow}>Finaliser la tâche</Text>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {submissionTask?.titre}
                </Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSubmissionVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.detailSection}>
                <Text style={[styles.sectionTitle, { marginBottom: 6 }]}>Preuve de réalisation (obligatoire)</Text>
                <TextInput
                  style={[styles.validationInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.cardBg }]}
                  placeholder="Décrivez ce qui a été réalisé..."
                  placeholderTextColor={theme.textSecondary}
                  value={proofText}
                  onChangeText={setProofText}
                  multiline
                />

                <Text style={[styles.sectionTitle, { marginTop: 10, marginBottom: 6 }]}>Document justificatif (optionnel)</Text>
                
                {proofDoc ? (
                  <View style={[styles.personRow, { justifyContent: "space-between" }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                      <Ionicons name="document-text-outline" size={20} color={theme.accent} />
                      <Text style={{ color: theme.textPrimary, fontSize: 13 }} numberOfLines={1}>
                        {proofDoc.nom_original}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          await documentService.deleteDocument(proofDoc.id);
                          setProofDoc(null);
                        } catch (e) {
                          console.error(e);
                          Alert.alert("Erreur", "Impossible de supprimer le document");
                        }
                      }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.proofDocBtn, { backgroundColor: theme.cardBg, borderColor: theme.border, justifyContent: "center" }]}
                    onPress={async () => {
                      try {
                        const result = await DocumentPicker.getDocumentAsync({
                          type: "*/*",
                          copyToCacheDirectory: true,
                        });
                        if (result.canceled || !result.assets || result.assets.length === 0) {
                          return;
                        }
                        const asset = result.assets[0];
                        setSubmittingProof(true);
                        const uploaded = await documentService.uploadDocument(
                          asset.uri,
                          asset.name,
                          asset.mimeType || "application/octet-stream",
                          submissionTask?.id_projet,
                          submissionTask?.id_tache
                        );
                        setProofDoc(uploaded);
                      } catch (error) {
                        console.error("Error picking document:", error);
                        Alert.alert("Erreur", "Impossible d'importer le fichier");
                      } finally {
                        setSubmittingProof(false);
                      }
                    }}
                    disabled={submittingProof}
                  >
                    <Ionicons name="cloud-upload-outline" size={18} color={theme.accent} />
                    <Text style={{ color: theme.accent, fontSize: 13, fontWeight: "600" }}>
                      Sélectionner un fichier
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: theme.accent, marginTop: 12 }, (!proofText.trim() || submittingProof) && { opacity: 0.5 }]}
                onPress={handleConfirmSubmission}
                disabled={!proofText.trim() || submittingProof}
              >
                {submittingProof ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Soumettre pour validation</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Validation Modal ── */}
      <Modal
        visible={validationVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setValidationVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalEyebrow}>Valider la tâche</Text>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {validationTask?.titre}
                </Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setValidationVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.detailSection}>
                <Text style={[styles.sectionTitle, { marginBottom: 6 }]}>Commentaire de validation (optionnel)</Text>
                <TextInput
                  style={[styles.validationInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.cardBg }]}
                  placeholder="Saisissez des remarques de validation..."
                  placeholderTextColor={theme.textSecondary}
                  value={validationComment}
                  onChangeText={setValidationComment}
                  multiline
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: "#10b981", marginTop: 12 }, validatingTask && { opacity: 0.5 }]}
                onPress={handleConfirmValidation}
                disabled={validatingTask}
              >
                {validatingTask ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Confirmer la validation</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Rejection Modal ── */}
      <Modal
        visible={rejectionVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRejectionVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalEyebrow}>Rejeter la tâche</Text>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {rejectionTask?.titre}
                </Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setRejectionVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.detailSection}>
                <Text style={[styles.sectionTitle, { marginBottom: 6 }]}>Motif du rejet (obligatoire)</Text>
                <TextInput
                  style={[styles.validationInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.cardBg }]}
                  placeholder="Expliquez pourquoi la tâche est rejetée..."
                  placeholderTextColor={theme.textSecondary}
                  value={rejectionComment}
                  onChangeText={setRejectionComment}
                  multiline
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: "#ef4444", marginTop: 12 }, (!rejectionComment.trim() || rejectingTask) && { opacity: 0.5 }]}
                onPress={handleConfirmRejection}
                disabled={!rejectionComment.trim() || rejectingTask}
              >
                {rejectingTask ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Confirmer le rejet</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    color: theme.textSecondary, fontSize: 11, fontWeight: "600",
    letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 2,
  },
  headerTitle:    { color: theme.textPrimary, fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
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
  floatingAddButton: {
    bottom: 90,
    right: 20,
    borderWidth: 1,
    borderColor: theme.accent + "66",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "86%",
    backgroundColor: theme.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 12 },
  modalEyebrow: { color: theme.textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  modalTitle: { color: theme.textPrimary, fontSize: 20, fontWeight: "800", marginTop: 2 },
  modalCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalScrollContent: { paddingBottom: 8, gap: 12 },
  modalHero: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.accent + "16",
    borderWidth: 1,
    borderColor: theme.accent + "35",
  },
  modalHeroContent: { flex: 1, minWidth: 0 },
  modalHeroLabel: { color: theme.accent, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  modalHeroTitle: { color: theme.textPrimary, fontSize: 18, lineHeight: 23, fontWeight: "800", marginTop: 3 },
  modalDescription: { color: theme.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 8 },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryPill: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryPillText: { fontSize: 13, fontWeight: "800" },
  detailGrid: { flexDirection: "row", gap: 10 },
  detailBox: {
    flex: 1,
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    padding: 12,
    gap: 7,
  },
  detailIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: theme.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: { color: theme.textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  detailValue: { color: theme.textPrimary, fontSize: 14, fontWeight: "700" },
  detailHint: { color: theme.textSecondary, fontSize: 13, lineHeight: 18 },
  detailSection: {
    backgroundColor: theme.cardBg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    padding: 13,
    gap: 10,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  sectionTitle: { flex: 1, color: theme.textPrimary, fontSize: 14, fontWeight: "800" },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.accent + "22",
    borderWidth: 1,
    borderColor: theme.accent + "55",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: theme.accent, fontSize: 14, fontWeight: "800" },
  personName: { color: theme.textPrimary, fontSize: 14, fontWeight: "700" },
  personMeta: { color: theme.textSecondary, fontSize: 12, marginTop: 1 },
  progressText: { color: theme.accent, fontSize: 13, fontWeight: "800" },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.border,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },

  viewModeContainer: {
    flexDirection: "row",
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    padding: 3,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  viewModeBtnActive: {
    backgroundColor: theme.accent,
  },
  viewModeBtnText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  viewModeBtnTextActive: {
    color: "#fff",
    fontWeight: "700",
  },

  // Kanban
  kanbanScrollContent: {
    paddingVertical: 10,
    paddingHorizontal: 5,
    gap: 16,
  },
  kanbanColumn: {
    width: 280,
    backgroundColor: theme.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    maxHeight: "100%",
  },
  kanbanColumnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 12,
  },
  kanbanColumnTitle: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  kanbanBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  kanbanBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  kanbanColumnList: {
    gap: 10,
    paddingBottom: 50,
  },
  kanbanEmpty: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  kanbanEmptyText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontStyle: "italic",
  },
  kanbanCard: {
    backgroundColor: theme.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    gap: 6,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  kanbanCardTitle: {
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  kanbanCardDesc: {
    color: theme.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  kanbanCardDate: {
    color: theme.textSecondary,
    fontSize: 11,
  },
  kanbanMoveBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: theme.cardBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  kanbanDetailsBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: theme.accent + "15",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.accent + "30",
  },

  // Calendar
  calendarCard: {
    backgroundColor: theme.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calendarMonthTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  calendarWeekdays: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  calendarWeekdayText: {
    width: 38,
    textAlign: "center",
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
  },
  calendarDayCell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayToday: {
    borderWidth: 1,
    borderColor: theme.accent + "80",
  },
  calendarDaySelected: {
    borderRadius: 19,
  },
  calendarDayText: {
    color: theme.textPrimary,
    fontSize: 13,
  },
  calendarDayTextSelected: {
    color: "#fff",
    fontWeight: "800",
  },
  calendarDotsRow: {
    flexDirection: "row",
    gap: 2,
    position: "absolute",
    bottom: 3,
  },
  calendarDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  calendarTasksHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 10,
  },
  calendarTasksTitle: {
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  calendarTasksEmpty: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarTasksEmptyText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontStyle: "italic",
  },

  // Validation actions
  validationInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    textAlignVertical: "top",
    fontSize: 13,
    marginBottom: 10,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#ef4444",
  },
  validateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#10b981",
  },
  btnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  
  // Timeline/history styles
  timelineContainer: {
    marginTop: 8,
    paddingLeft: 4,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
  },
  timelineLeft: {
    alignItems: "center",
    width: 16,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.border,
    marginVertical: 4,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: 16,
    gap: 4,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timelineStatus: {
    fontSize: 11,
    fontWeight: "800",
  },
  timelineDate: {
    color: theme.textSecondary,
    fontSize: 11,
  },
  timelineComment: {
    color: theme.textPrimary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  
  // Tab container for top tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: theme.accent,
  },
  tabButtonText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  proofDocBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
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

});
