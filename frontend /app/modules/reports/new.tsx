import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/theme";
import { reportService } from "@/services/reportService";
import { projectService, type Project } from "@/services/projectService";

// ─── Thème ────────────────────────────────────────────────────────────────────
const T = {
  bg: "#080f1a",
  surface: "#0d1825",
  card: "#111e2e",
  cardActive: "#0a2040",
  border: "#1a2e45",
  borderActive: "#1d6ef5",
  accent: "#1d6ef5",
  accentGlow: "#1d6ef520",
  accentSoft: "#1d6ef514",
  success: "#10c97a",
  successSoft: "#10c97a14",
  warning: "#f5a623",
  warningSoft: "#f5a62314",
  danger: "#f5365c",
  dangerSoft: "#f5365c14",
  info: "#8b5cf6",
  infoSoft: "#8b5cf614",
  textPrimary: "#e8f0fe",
  textSecondary: "#4a6b8a",
  textMuted: "#2a4a6a",
  placeholder: "#2a4a6a",
};

// ─── Types de rapport ─────────────────────────────────────────────────────────
interface ReportType {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  softColor: string;
  description: string;
}

// ─── Composant TypeCard ───────────────────────────────────────────────────────
const TypeCard = ({
  type,
  selected,
  onPress,
}: {
  type: ReportType;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    style={[
      styles.typeCard,
      selected && { borderColor: type.color, backgroundColor: type.softColor },
    ]}
    onPress={onPress}
    android_ripple={{ color: type.color + "20", borderless: false }}
  >
    {/* Indicateur sélectionné */}
    {selected && (
      <View style={[styles.selectedDot, { backgroundColor: type.color }]} />
    )}

    <View
      style={[
        styles.typeIconBg,
        { backgroundColor: selected ? type.color + "22" : T.surface },
      ]}
    >
      <Ionicons
        name={type.icon}
        size={22}
        color={selected ? type.color : T.textSecondary}
      />
    </View>

    <Text style={[styles.typeLabel, selected && { color: type.color }]}>
      {type.label}
    </Text>
    <Text style={styles.typeDesc}>{type.description}</Text>
  </Pressable>
);

// ─── Écran principal ──────────────────────────────────────────────────────────
export default function NewReportScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const REPORT_TYPES: ReportType[] = [
    {
      id: "progression",
      label: t("new_report.progression"),
      icon: "trending-up-outline",
      color: T.accent,
      softColor: T.accentSoft,
      description: t("new_report.progression_desc"),
    },
    {
      id: "probleme",
      label: t("new_report.problem"),
      icon: "warning-outline",
      color: T.danger,
      softColor: T.dangerSoft,
      description: t("new_report.problem_desc"),
    },
    {
      id: "completion",
      label: t("new_report.completion"),
      icon: "checkmark-circle-outline",
      color: T.success,
      softColor: T.successSoft,
      description: t("new_report.completion_desc"),
    },
    {
      id: "autre",
      label: t("new_report.other"),
      icon: "layers-outline",
      color: T.info,
      softColor: T.infoSoft,
      description: t("new_report.other_desc"),
    },
  ];
  const params = useLocalSearchParams<{ id_projet?: string; id_tache?: string; titre_tache?: string; id_rapport?: string }>();
  const { theme, isDark } = useAppTheme();
  
  const [selectedType, setSelectedType] = useState<string>("progression");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [titleFocused, setTitleFocused] = useState(false);
  const [contentFocused, setContentFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Projets
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    params.id_projet ? Number(params.id_projet) : null
  );
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    if (params.id_tache) {
      setSelectedType("completion");
      setTitle(params.titre_tache ? `Rapport : ${params.titre_tache}` : "");
      setContent(`Rapport de complétion pour la tâche "${params.titre_tache || ""}" (ID: ${params.id_tache}).\n\nTravail réalisé : `);
    }
    if (params.id_projet) {
      setSelectedProjectId(Number(params.id_projet));
    }
  }, [params.id_projet, params.id_tache, params.titre_tache]);

  useEffect(() => {
    if (params.id_rapport) {
      const loadReport = async () => {
        try {
          const rep = await reportService.getReportDetails(Number(params.id_rapport));
          setTitle(rep.titre);
          setContent(rep.contenu);
          setSelectedType(rep.type);
          setSelectedProjectId(rep.id_projet);
        } catch (e) {
          console.error("Failed to load report for editing:", e);
          Alert.alert("Erreur", "Impossible de charger les détails du rapport.");
        }
      };
      loadReport();
    }
  }, [params.id_rapport]);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const data = await projectService.getProjects();
        setProjects(data);
        if (!params.id_projet && data.length > 0) {
          setSelectedProjectId(data[0].id_projet);
        }
      } catch (error) {
        console.error("Error loading projects:", error);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, [params.id_projet]);

  const activeType = REPORT_TYPES.find((t) => t.id === selectedType);
  const canSend = title.trim().length > 0 && content.trim().length > 0 && selectedProjectId !== null;

  const handleSaveDraft = async () => {
    if (!canSend || selectedProjectId === null || saving) return;
    setSaving(true);
    try {
      if (params.id_rapport) {
        await reportService.updateReport(Number(params.id_rapport), {
          titre: title,
          contenu: content,
          type: selectedType,
          id_projet: selectedProjectId,
          id_tache: params.id_tache ? Number(params.id_tache) : null,
        });
      } else {
        await reportService.createReport({
          titre: title,
          contenu: content,
          type: selectedType,
          id_projet: selectedProjectId,
          id_tache: params.id_tache ? Number(params.id_tache) : null,
        });
      }
      Alert.alert("Succès", "Rapport enregistré en brouillon.");
      router.back();
    } catch (error) {
      console.error("Error saving report draft:", error);
      Alert.alert("Erreur", "Impossible d'enregistrer le brouillon.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAndSubmit = async () => {
    if (!canSend || selectedProjectId === null || saving) return;
    setSaving(true);
    try {
      let repId = Number(params.id_rapport);
      if (params.id_rapport) {
        await reportService.updateReport(repId, {
          titre: title,
          contenu: content,
          type: selectedType,
          id_projet: selectedProjectId,
          id_tache: params.id_tache ? Number(params.id_tache) : null,
        });
      } else {
        const created = await reportService.createReport({
          titre: title,
          contenu: content,
          type: selectedType,
          id_projet: selectedProjectId,
          id_tache: params.id_tache ? Number(params.id_tache) : null,
        });
        repId = created.id_rapport;
      }
      await reportService.submitReport(repId);
      Alert.alert("Succès", "Le rapport a été soumis avec succès !");
      router.back();
    } catch (error) {
      console.error("Error creating and submitting report:", error);
      Alert.alert("Erreur", "Impossible de soumettre le rapport.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={["top", "bottom"]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={Platform.OS === "android" ? theme.bg : undefined}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={T.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {params.id_rapport ? "Modifier le rapport" : t("new_report.title")}
            </Text>
            <Text style={styles.headerSub}>
              {activeType?.label ?? t("new_report.select_type")}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.sendBtn,
              canSend && !saving
                ? { backgroundColor: T.card, borderWidth: 1, borderColor: T.border }
                : styles.sendBtnDisabled,
            ]}
            onPress={handleSaveDraft}
            activeOpacity={0.8}
            disabled={!canSend || saving}
          >
            <Ionicons
              name="save-outline"
              size={15}
              color={canSend && !saving ? T.accent : T.textMuted}
            />
            <Text style={[styles.sendText, { color: canSend && !saving ? T.accent : T.textMuted }]}>
              Brouillon
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Section Type ── */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: T.accent }]} />
              <Text style={styles.sectionLabel}>{t("new_report.type_section")}</Text>
            </View>

            <View style={styles.typeGrid}>
              {REPORT_TYPES.map((type) => (
                <TypeCard
                  key={type.id}
                  type={type}
                  selected={selectedType === type.id}
                  onPress={() => setSelectedType(type.id)}
                />
              ))}
            </View>
          </View>

          {/* ── Section Projet ── */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: activeType?.color ?? T.accent }]} />
              <Text style={styles.sectionLabel}>{t("new_report.project_section", "PROJET ASSOCIÉ")}</Text>
            </View>

            {loadingProjects ? (
              <ActivityIndicator size="small" color={T.accent} style={{ alignSelf: "flex-start", marginVertical: 8 }} />
            ) : projects.length === 0 ? (
              <Text style={{ color: T.danger }}>Aucun projet disponible.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {projects.map((p) => {
                  const isSelected = selectedProjectId === p.id_projet;
                  return (
                    <TouchableOpacity
                      key={p.id_projet}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => {
                        if (!params.id_tache) {
                          setSelectedProjectId(p.id_projet);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipTxt, isSelected && styles.chipTxtActive]}>
                        {p.titre}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* ── Section Titre ── */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionDot,
                  { backgroundColor: activeType?.color ?? T.accent },
                ]}
              />
              <Text style={styles.sectionLabel}>{t("new_report.title_section")}</Text>
              <Text style={styles.sectionCounter}>{title.length}/80</Text>
            </View>

            <View
              style={[
                styles.inputWrapper,
                titleFocused && {
                  borderColor: activeType?.color ?? T.accent,
                  backgroundColor: activeType?.softColor ?? T.accentSoft,
                },
              ]}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={titleFocused ? (activeType?.color ?? T.accent) : T.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder={t("new_report.title_placeholder")}
                placeholderTextColor={T.placeholder}
                value={title}
                onChangeText={(t) => setTitle(t.slice(0, 80))}
                onFocus={() => setTitleFocused(true)}
                onBlur={() => setTitleFocused(false)}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* ── Section Contenu ── */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionDot,
                  { backgroundColor: activeType?.color ?? T.accent },
                ]}
              />
              <Text style={styles.sectionLabel}>{t("new_report.content_section")}</Text>
              <Text style={styles.sectionCounter}>{content.length}/500</Text>
            </View>

            <View
              style={[
                styles.inputWrapper,
                styles.textAreaWrapper,
                contentFocused && {
                  borderColor: activeType?.color ?? T.accent,
                  backgroundColor: activeType?.softColor ?? T.accentSoft,
                },
              ]}
            >
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t("new_report.content_placeholder")}
                placeholderTextColor={T.placeholder}
                value={content}
                onChangeText={(t) => setContent(t.slice(0, 500))}
                onFocus={() => setContentFocused(true)}
                onBlur={() => setContentFocused(false)}
                multiline
                textAlignVertical="top"
                numberOfLines={8}
              />
            </View>
          </View>

          {/* ── Indicateur de complétion ── */}
          <View style={styles.completionRow}>
            <CompletionDot done={!!selectedType} label={t("new_report.type_label")} />
            <View style={styles.completionLine} />
            <CompletionDot done={title.trim().length > 0} label={t("new_report.title_section")} />
            <View style={styles.completionLine} />
            <CompletionDot done={content.trim().length > 0} label={t("new_report.content_label")} />
          </View>

          {/* Action : Soumettre directement */}
          {canSend && (
            <TouchableOpacity
              style={[
                styles.submitActionBtn,
                { backgroundColor: activeType?.color ?? T.accent, marginTop: 28 },
                saving && { opacity: 0.7 }
              ]}
              onPress={handleCreateAndSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#fff" />
                  <Text style={styles.submitActionBtnText}>Soumettre pour validation</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const CompletionDot = ({ done, label }: { done: boolean; label: string }) => (
  <View style={styles.completionItem}>
    <View
      style={[
        styles.completionCircle,
        done && { backgroundColor: T.success, borderColor: T.success },
      ]}
    >
      {done && <Ionicons name="checkmark" size={10} color="#fff" />}
    </View>
    <Text style={[styles.completionLabel, done && { color: T.success }]}>
      {label}
    </Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: T.bg,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: T.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: T.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  headerSub: {
    color: T.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 6,
  },
  sendBtnDisabled: {
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
  },
  sendText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // ── Sections ──
  sectionBlock: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  sectionLabel: {
    color: T.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    flex: 1,
  },
  sectionCounter: {
    color: T.textMuted,
    fontSize: 11,
  },

  // ── Grille de types ──
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  typeCard: {
    width: "47.5%",
    backgroundColor: T.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: T.border,
    position: "relative",
    overflow: "hidden",
  },
  selectedDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  typeIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  typeLabel: {
    color: T.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  typeDesc: {
    color: T.textSecondary,
    fontSize: 10,
    lineHeight: 14,
  },

  // ── Chips ──
  chipsScroll: {
    marginTop: 10,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: T.border,
    marginRight: 8,
    backgroundColor: T.card,
  },
  chipActive: {
    backgroundColor: T.accent,
    borderColor: T.accent,
  },
  chipTxt: {
    color: T.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  chipTxtActive: {
    color: "#fff",
  },

  // ── Inputs ──
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: T.border,
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  textAreaWrapper: {
    alignItems: "flex-start",
    paddingTop: 12,
    paddingBottom: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: T.textPrimary,
    fontSize: 14,
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 140,
    paddingVertical: 0,
    lineHeight: 22,
  },

  // ── Indicateur de complétion ──
  completionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    paddingHorizontal: 20,
  },
  completionItem: {
    alignItems: "center",
    gap: 4,
  },
  completionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  completionLabel: {
    color: T.textMuted,
    fontSize: 10,
    fontWeight: "600",
  },
  completionLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: T.border,
    marginHorizontal: 8,
    marginBottom: 14,
  },
  submitActionBtn: {
    flexDirection: "row",
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitActionBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
