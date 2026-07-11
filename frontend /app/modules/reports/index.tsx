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
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/theme";
import { userService } from "@/services/userService";
import { reportService, type Report } from "@/services/reportService";
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
const EmptyState = ({ filterKey, t }: { filterKey: string; t: (key: string) => string }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyRing3} />
    <View style={styles.emptyRing2} />
    <View style={styles.emptyRing1} />

    <View style={styles.emptyIconBox}>
      <Ionicons name="stats-chart" size={38} color={T.textSecondary} />
    </View>

    <Text style={styles.emptyTitle}>{t("reports.empty_title")}</Text>
    <Text style={styles.emptyDesc}>
      {filterKey === "pending"
        ? t("reports.empty_pending")
        : filterKey === "sent"
        ? t("reports.empty_sent")
        : filterKey === "archived"
        ? t("reports.empty_archived")
        : t("reports.empty_default")}
    </Text>

    <View style={styles.emptyHint}>
      <Ionicons name="add-circle-outline" size={14} color={T.accent} />
      <Text style={styles.emptyHintText}>
        {t("reports.empty_hint")}
      </Text>
    </View>
  </View>
);

// ─── Écran principal ──────────────────────────────────────────────────────────
export default function RapportScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { theme, isDark } = useAppTheme();
  
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [isAdmin, setIsAdmin]           = useState(false);
  const [reports, setReports]           = useState<Report[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailVisible, setDetailVisible]   = useState(false);
  const [exporting, setExporting]           = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await reportService.getMyReports(activeFilter);
      setReports(data);
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
        setIsAdmin(user?.role === "admin");
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
      fetchReports();
    };
    init();
  }, [isFocused, activeFilter]);

  const handleOpenDetails = (report: Report) => {
    setSelectedReport(report);
    setDetailVisible(true);
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
        // Fallback pour mobile : ouvre l'URL directe avec authentification par token
        const token = await getStorageItem('access_token');
        const url = `${apiClient.defaults.baseURL}/api/v1/reports/${selectedReport.id_rapport}/export-pdf?token=${token}`;
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
      Alert.alert(t("common.error"), "Impossible de générer le fichier PDF.");
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadgeConfig = (status: string) => {
    const config: Record<string, { label: string; color: string }> = {
      pending: { label: t("reports.filter_pending"), color: "#f59e0b" },
      sent: { label: t("reports.filter_sent"), color: "#06b6d4" },
      validated: { label: "Validé", color: "#10b981" },
      archived: { label: t("reports.filter_archived"), color: "#6b7280" },
    };
    return config[status] || { label: status, color: "#9ca3af" };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={["top", "bottom"]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={Platform.OS === "android" ? theme.bg : undefined}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>{t("reports.my_reports")}</Text>
          <Text style={styles.headerTitle}>{t("reports.title")}</Text>
        </View>
      </View>

      {/* ── Filtres ── */}
      <View style={styles.filterRow}>
        {["all", "pending", "sent", "archived"].map((f) => {
          const active = activeFilter === f;
          const label =
            f === "all"
              ? t("reports.filter_all")
              : f === "pending"
              ? t("reports.filter_pending")
              : f === "sent"
              ? t("reports.filter_sent")
              : t("reports.filter_archived");
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

      {/* ── Séparateur ── */}
      <View style={styles.divider} />

      {/* ── Contenu ── */}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.accent} />
        ) : reports.length === 0 ? (
          <EmptyState filterKey={activeFilter} t={t} />
        ) : (
          <ScrollView
            style={{ width: "100%", paddingHorizontal: 16 }}
            contentContainerStyle={{ gap: 12, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            {reports.map((report) => {
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
                    {new Date(report.date_generation).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {isAdmin && (
        <AddButton
          onPress={() => router.push("/(tabs)/Home/new-report")}
          backgroundColor={theme.accent}
          accessibilityLabel="Ajouter un rapport"
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

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Contenu du rapport</Text>
                  <Text style={styles.reportContent}>{selectedReport.contenu}</Text>
                </View>

                {/* PDF Export Action Button */}
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

  // ── Header ──
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

  // ── Filtres ──
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 4,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
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
    fontSize: 13,
    fontWeight: "500",
  },
  filterTextActive: {
    color: T.accent,
    fontWeight: "700",
  },
  filterActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
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

  // ── Contenu ──
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Report Card ──
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

  // ── Empty State ──
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

  // ── Modal Details ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "86%",
    backgroundColor: T.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: T.border,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 12,
  },
  modalEyebrow: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  modalTitle: {
    color: T.textPrimary,
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
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
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
    padding: 14,
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
    lineHeight: 20,
  },
  exportBtn: {
    flexDirection: "row",
    backgroundColor: T.accent,
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  exportBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  floatingAddButton: {
    bottom: 90,
    right: 20,
    borderWidth: 1,
  },
});
