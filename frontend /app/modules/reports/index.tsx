import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Modal,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
  TextInput
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/theme";
import { userService } from "@/services/userService";
import { reportService, type Report, type HistoriqueRapport } from "@/services/reportService";
import { projectService } from "@/services/projectService";
import { getStorageItem } from "@/utils/storage";
import apiClient from "@/services/apiClient";
import AddButton from "../../../components/AddButton";

// ─── Thème Palette ────────────────────────────────────────────────────────────
const T = {
  bg: "#080f1a",
  surface: "#0d1825",
  card: "#111e2e",
  border: "#1a2e45",
  accent: "#1d6ef5",
  accentSoft: "#1d6ef518",
  textPrimary: "#e8f0fe",
  textSecondary: "#4a6b8a",
  textMuted: "#2a4a6a",
};

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = ({ filterKey, activeTab }: { filterKey: string; activeTab: string }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyRing3} />
    <View style={styles.emptyRing2} />
    <View style={styles.emptyRing1} />

    <View style={styles.emptyIconBox}>
      <Ionicons name="stats-chart" size={38} color={T.textSecondary} />
    </View>

    <Text style={styles.emptyTitle}>Aucun rapport</Text>
    <Text style={styles.emptyDesc}>
      {activeTab === "to_validate"
        ? "Il n'y a aucun rapport en attente de validation pour le moment."
        : "Vous n'avez aucun rapport correspondant à ce filtre."}
    </Text>

    {activeTab === "mine" && (
      <View style={styles.emptyHint}>
        <Ionicons name="add-circle-outline" size={14} color={T.accent} />
        <Text style={styles.emptyHintText}>
          Appuyez sur le bouton "+" pour rédiger un rapport.
        </Text>
      </View>
    )}
  </View>
);

// ─── Écran principal ──────────────────────────────────────────────────────────
export default function RapportScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { theme, isDark } = useAppTheme();
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"mine" | "to_validate">("mine");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsToValidate, setReportsToValidate] = useState<Report[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // validation / submission states
  const [canCreate, setCanCreate] = useState(false);
  const [canValidate, setCanValidate] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoriqueRapport[]>([]);
  const [validationComment, setValidationComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      if (activeTab === "mine") {
        const data = await reportService.getMyReports(activeFilter);
        setReports(data);
      } else {
        const data = await reportService.getReportsToValidate();
        setReportsToValidate(data);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const user = await userService.getCurrentUser();
        setCurrentUserId(user?.id);
        setCanCreate(user?.role === "personnel");

        // Déterminer si l'utilisateur est manager/chef de projet
        const projects = await projectService.getProjects();
        const hasManagerRole = projects.some(p => p.id_administrateur === user?.id) || user?.role === "admin";
        
        // Ou si la route to-validate renvoie des éléments ou est autorisée
        try {
          const toVal = await reportService.getReportsToValidate();
          setReportsToValidate(toVal);
          setCanValidate(hasManagerRole || user?.role === "admin" || toVal.length > 0);
        } catch {
          setCanValidate(hasManagerRole || user?.role === "admin");
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
      fetchReports();
    };
    if (isFocused) {
      init();
    }
  }, [isFocused, activeFilter, activeTab]);

  const handleOpenDetails = async (report: Report) => {
    setSelectedReport(report);
    setDetailVisible(true);
    setValidationComment("");
    setHistory([]);
    try {
      const hist = await reportService.getReportHistory(report.id_rapport);
      setHistory(hist);
    } catch (e) {
      console.log("Failed to load history for report:", e);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedReport) return;
    setExporting(true);
    try {
      if (Platform.OS === 'web') {
        const blob = await reportService.exportReportPDF(selectedReport.id_rapport);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedReport.titre.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const token = await getStorageItem('access_token');
        const url = `${apiClient.defaults.baseURL}/api/v1/reports/${selectedReport.id_rapport}/export-pdf?token=${token}`;
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
      Alert.alert("Erreur", "Impossible de générer le fichier PDF.");
    } finally {
      setExporting(false);
    }
  };

  const handleSendSubmission = async () => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      const updated = await reportService.submitReport(selectedReport.id_rapport);
      Alert.alert("Succès", "Le rapport a été soumis pour validation.");
      setDetailVisible(false);
      fetchReports();
    } catch (e) {
      console.error("Failed to submit report:", e);
      Alert.alert("Erreur", "Impossible de soumettre le rapport.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      await reportService.validateReport(selectedReport.id_rapport, validationComment);
      Alert.alert("Succès", "Rapport validé.");
      setDetailVisible(false);
      fetchReports();
    } catch (e) {
      console.error("Failed to validate report:", e);
      Alert.alert("Erreur", "Impossible de valider le rapport.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReport) return;
    if (!validationComment.trim()) {
      Alert.alert("Information", "Veuillez saisir un commentaire expliquant le motif du rejet.");
      return;
    }
    setActionLoading(true);
    try {
      await reportService.rejectReport(selectedReport.id_rapport, validationComment);
      Alert.alert("Rapport rejeté", "Le rapport a été renvoyé à son auteur.");
      setDetailVisible(false);
      fetchReports();
    } catch (e) {
      console.error("Failed to reject report:", e);
      Alert.alert("Erreur", "Impossible de rejeter le rapport.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeConfig = (status: string) => {
    const config: Record<string, { label: string; color: string }> = {
      brouillon: { label: "Brouillon", color: "#6b7280" },
      soumis: { label: "Soumis", color: "#f59e0b" },
      valide: { label: "Validé", color: "#10b981" },
      rejete: { label: "Rejeté", color: "#ef4444" },
      pending: { label: "En attente", color: "#f59e0b" },
      sent: { label: "Soumis", color: "#06b6d4" },
      validated: { label: "Validé", color: "#10b981" },
      archived: { label: "Archivé", color: "#6b7280" },
    };
    return config[status] || { label: status, color: "#9ca3af" };
  };

  const currentListReports = activeTab === "mine" ? reports : reportsToValidate;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={["top", "bottom"]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={Platform.OS === "android" ? theme.bg : undefined}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>RAPPORTS HEBDOMADAIRES</Text>
          <Text style={styles.headerTitle}>Rapports</Text>
        </View>
      </View>

      {/* ── Navigation Tabs (Mes rapports vs À valider) ── */}
      {canValidate && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "mine" && styles.tabButtonActive]}
            onPress={() => {
              setActiveTab("mine");
              setLoading(true);
            }}
          >
            <Ionicons name="document-text" size={16} color={activeTab === "mine" ? "#fff" : T.textSecondary} />
            <Text style={[styles.tabButtonText, activeTab === "mine" && styles.tabButtonTextActive]}>
              Mes rapports
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "to_validate" && styles.tabButtonActive]}
            onPress={() => {
              setActiveTab("to_validate");
              setLoading(true);
            }}
          >
            <Ionicons name="ribbon" size={16} color={activeTab === "to_validate" ? "#fff" : T.textSecondary} />
            <Text style={[styles.tabButtonText, activeTab === "to_validate" && styles.tabButtonTextActive]}>
              À valider ({reportsToValidate.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Filtres de statut (seulement pour Mes rapports) ── */}
      {activeTab === "mine" && (
        <View style={styles.filterRow}>
          {["all", "brouillon", "soumis", "valide", "rejete"].map((f) => {
            const active = activeFilter === f;
            const label =
              f === "all"
                ? "Tous"
                : f === "brouillon"
                ? "Brouillon"
                : f === "soumis"
                ? "Soumis"
                : f === "valide"
                ? "Validé"
                : "Rejeté";
            return (
              <Pressable
                key={f}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {label}
                </Text>
                {active && <View style={styles.filterActiveDot} />}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* ── Séparateur ── */}
      <View style={styles.divider} />

      {/* ── Contenu de la Liste ── */}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.accent} />
        ) : currentListReports.length === 0 ? (
          <EmptyState filterKey={activeFilter} activeTab={activeTab} />
        ) : (
          <ScrollView
            style={{ width: "100%", paddingHorizontal: 16 }}
            contentContainerStyle={{ gap: 12, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            {currentListReports.map((report) => {
              const statusCfg = getStatusBadgeConfig(report.statut);
              return (
                <TouchableOpacity
                  key={report.id_rapport}
                  style={styles.reportCard}
                  onPress={() => handleOpenDetails(report)}
                  activeOpacity={0.8}
                >
                  <View style={styles.reportCardHeader}>
                    <Text style={styles.reportType}>{report.type.toUpperCase()}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + "22", borderColor: statusCfg.color }]}>
                      <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.reportCardTitle} numberOfLines={1}>{report.titre}</Text>
                  <Text style={styles.reportCardDate}>
                    Créé le : {new Date(report.date_generation).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── Floating Add Button ── */}
      {canCreate && activeTab === "mine" && (
        <AddButton
          onPress={() => router.push("/(tabs)/Home/new-report")}
          backgroundColor={theme.accent}
          accessibilityLabel="Créer un rapport"
          shadowColor={theme.accent}
          size={56}
          iconSize={32}
          style={[styles.floatingAddButton, { borderColor: theme.accent + "66" }]}
        />
      )}

      {/* ── Detail Modal ── */}
      <Modal
        visible={detailVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalEyebrow}>Détail du rapport</Text>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {selectedReport?.titre}
                </Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedReport && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                
                {/* Métadonnées */}
                <View style={styles.detailGrid}>
                  <View style={styles.detailBox}>
                    <Ionicons name="calendar-outline" size={16} color="#f5a623" />
                    <Text style={styles.detailLabel}>Généré le</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedReport.date_generation).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.detailBox}>
                    <Ionicons name="options-outline" size={16} color={theme.accent} />
                    <Text style={styles.detailLabel}>Type / Statut</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {selectedReport.type.toUpperCase()} / {getStatusBadgeConfig(selectedReport.statut).label}
                    </Text>
                  </View>
                </View>

                {/* Contenu */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Contenu du rapport</Text>
                  <Text style={styles.reportContent}>{selectedReport.contenu}</Text>
                </View>

                {/* Avis de validation si disponible */}
                {selectedReport.commentaire_validation && (
                  <View style={[styles.detailSection, { borderColor: theme.border }]}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Remarque du validateur</Text>
                    <Text style={[styles.reportContent, { fontStyle: "italic" }]}>
                      "{selectedReport.commentaire_validation}"
                    </Text>
                  </View>
                )}

                {/* Action : Soumission / Modification (pour l'auteur si brouillon/rejeté) */}
                {selectedReport.id_personnel === currentUserId && (selectedReport.statut === "brouillon" || selectedReport.statut === "rejete") && (
                  <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
                    <TouchableOpacity
                      style={[styles.exportBtn, { flex: 1, marginTop: 0 }]}
                      onPress={() => {
                        setDetailVisible(false);
                        router.push({
                          pathname: "/(tabs)/Home/new-report",
                          params: { id_rapport: selectedReport.id_rapport }
                        });
                      }}
                    >
                      <Ionicons name="create" size={18} color={theme.textPrimary} />
                      <Text style={styles.exportBtnText}>Modifier</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.submitActionBtn, { flex: 1, marginTop: 0 }, actionLoading && { opacity: 0.7 }]}
                      onPress={handleSendSubmission}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="paper-plane" size={18} color="#fff" />
                          <Text style={styles.submitActionBtnText}>Soumettre</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Action : Validation / Rejet (pour le validateur si soumis) */}
                {activeTab === "to_validate" && selectedReport.statut === "soumis" && (
                  <View style={styles.validationWrapper}>
                    <Text style={[styles.sectionTitle, { marginBottom: 6 }]}>Décision de validation</Text>
                    <TextInput
                      style={[styles.validationInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.cardBg }]}
                      placeholder="Commentaire ou remarques (obligatoire si rejet)..."
                      placeholderTextColor={T.textSecondary}
                      value={validationComment}
                      onChangeText={setValidationComment}
                      multiline
                    />
                    <View style={styles.btnRow}>
                      <TouchableOpacity
                        style={[styles.rejectBtn, actionLoading && { opacity: 0.7 }]}
                        onPress={handleReject}
                        disabled={actionLoading}
                      >
                        <Ionicons name="close-circle" size={18} color="#fff" />
                        <Text style={styles.btnText}>Rejeter</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.validateBtn, actionLoading && { opacity: 0.7 }]}
                        onPress={handleValidate}
                        disabled={actionLoading}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.btnText}>Valider</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Historique Timeline */}
                {history.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Suivi du cycle de validation</Text>
                    <View style={styles.timelineContainer}>
                      {history.map((h, index) => {
                        const isLast = index === history.length - 1;
                        const statusCfg = getStatusBadgeConfig(h.nouveau_statut);
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
                                  {new Date(h.date).toLocaleDateString()} à {new Date(h.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

                {/* PDF Export Button */}
                <TouchableOpacity
                  style={[styles.exportBtn, exporting && { opacity: 0.7 }]}
                  onPress={handleExportPDF}
                  disabled={exporting}
                >
                  {exporting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="document-text-outline" size={18} color="#fff" />
                      <Text style={styles.exportBtnText}>Exporter en PDF</Text>
                    </>
                  )}
                </TouchableOpacity>

              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerEyebrow: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  headerTitle: {
    color: T.textPrimary,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: T.card,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: T.border,
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
    backgroundColor: T.accent,
  },
  tabButtonText: {
    color: T.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: "#fff",
    fontWeight: "700",
  },

  // Filtres
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 4,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: T.accentSoft,
    borderColor: T.accent + "55",
  },
  filterText: {
    color: T.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  filterTextActive: {
    color: T.accent,
    fontWeight: "700",
  },
  filterActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.accent,
  },

  divider: {
    height: 1,
    backgroundColor: T.border,
    marginTop: 12,
    marginBottom: 16,
    marginHorizontal: 16,
    opacity: 0.5,
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Report Card
  reportCard: {
    backgroundColor: T.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    gap: 8,
  },
  reportCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reportType: {
    color: T.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
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
  reportCardTitle: {
    color: T.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  reportCardDate: {
    color: T.textSecondary,
    fontSize: 12,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyRing1: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: T.border,
    opacity: 0.6,
    top: -10,
  },
  emptyRing2: {
    position: "absolute",
    width: 175,
    height: 175,
    borderRadius: 87.5,
    borderWidth: 1,
    borderColor: T.border,
    opacity: 0.3,
    top: -32,
  },
  emptyRing3: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: T.border,
    opacity: 0.15,
    top: -55,
  },
  emptyIconBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: T.card,
    borderWidth: 1.5,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    color: T.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  emptyDesc: {
    color: T.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: T.accentSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.accent + "33",
  },
  emptyHintText: {
    color: T.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },

  // Modal Detail Drawer
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "90%",
    backgroundColor: T.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 32,
    borderWidth: 1,
    borderColor: T.border,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 16,
  },
  modalEyebrow: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  modalTitle: {
    color: T.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
  },
  modalScrollContent: {
    paddingBottom: 40,
    gap: 20,
  },
  detailGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  detailBox: {
    flex: 1,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  detailLabel: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  detailValue: {
    color: T.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  detailSection: {
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    color: T.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  reportContent: {
    color: T.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },

  // Actions
  submitActionBtn: {
    flexDirection: "row",
    backgroundColor: T.accent,
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  submitActionBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  validationWrapper: {
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  validationInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    minHeight: 64,
    textAlignVertical: "top",
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#ef4444",
    borderRadius: 10,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  validateBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#10b981",
    borderRadius: 10,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Timeline
  timelineContainer: {
    marginTop: 10,
    paddingLeft: 6,
  },
  timelineRow: {
    flexDirection: "row",
    minHeight: 50,
  },
  timelineLeft: {
    alignItems: "center",
    width: 20,
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
    backgroundColor: T.border,
    marginVertical: 4,
  },
  timelineRight: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timelineStatus: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  timelineDate: {
    color: T.textSecondary,
    fontSize: 11,
  },
  timelineComment: {
    color: T.textSecondary,
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },

  exportBtn: {
    flexDirection: "row",
    backgroundColor: T.surface,
    borderColor: T.border,
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  exportBtnText: {
    color: T.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  floatingAddButton: {
    bottom: 90,
    right: 20,
    borderWidth: 1,
  },
});
