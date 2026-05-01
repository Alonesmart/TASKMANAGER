import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../../theme";

// ─── Thème ────────────────────────────────────────────────────────────────────
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

// ─── Onglets ──────────────────────────────────────────────────────────────────
const FILTER_KEYS = ["all", "pending", "sent", "archived"] as const;

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = ({ filterKey, t }: { filterKey: (typeof FILTER_KEYS)[number]; t: (key: string) => string }) => (
  <View style={styles.emptyContainer}>
    {/* Cercles décoratifs */}
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
  const { t } = useTranslation();
  const { theme, isDark } = useAppTheme();
  const [activeFilter, setActiveFilter] = useState<(typeof FILTER_KEYS)[number]>("all");
  const [activeTab, setActiveTab] = useState("reports");

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
        {FILTER_KEYS.map((f) => {
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
              android_ripple={{ color: T.accent + "20", borderless: false }}
            >
              <Text
                style={[styles.filterText, active && styles.filterTextActive]}
              >
                {label}
              </Text>
              {active && <View style={styles.filterActiveDot} />}
            </Pressable>
          );
        })}
      </View>

      {/* ── Séparateur ── */}
      <View style={styles.divider} />

      {/* ── Contenu (empty state) ── */}
      <View style={styles.content}>
        <EmptyState filterKey={activeFilter} t={t} />
      </View>

       <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/(tabs)/Home/new-report")}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
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
fab: {
  position: "absolute",
  right: 20,
  bottom: Platform.OS === "ios" ? 94 : 78,
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: T.accent,
  alignItems: "center",
  justifyContent: "center",
  shadowColor: T.accent,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.45,
  shadowRadius: 12,
  elevation: 10,
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
    marginHorizontal: 16,
    opacity: 0.5,
  },

  // ── Contenu ──
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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

  // ── Tab Bar ──
  tabBar: {
    flexDirection: "row",
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 16 : 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    position: "relative",
    paddingVertical: 2,
  },
  tabActivePill: {
    position: "absolute",
    top: -8,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: T.accent,
  },
  tabLabel: {
    color: T.textSecondary,
    fontSize: 9,
    marginTop: 3,
    fontWeight: "500",
  },
  tabLabelActive: {
    color: T.accent,
    fontWeight: "700",
  },
});
