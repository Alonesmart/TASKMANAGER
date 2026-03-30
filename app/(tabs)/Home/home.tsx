import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// ─── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  bg: "#080c12",
  surface: "#0f1520",
  card: "#141c28",
  cardBorder: "#1e2d42",
  accent: "#3d8ef8",
  accentGlow: "#3d8ef820",
  accentDim: "#3d8ef840",
  green: "#2dd4a0",
  greenDim: "#2dd4a015",
  orange: "#ff9f43",
  orangeDim: "#ff9f4315",
  red: "#ff6b6b",
  redDim: "#ff6b6b15",
  purple: "#a78bfa",
  purpleDim: "#a78bfa15",
  textPrimary: "#eef2ff",
  textSecondary: "#5a7196",
  textMuted: "#2e4060",
};

// ─── Animated Card ─────────────────────────────────────────────────────────────
function AnimatedCard({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 480,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ─── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <View style={statStyles.pill}>
      <View style={[statStyles.dot, { backgroundColor: color }]} />
      <View>
        <Text style={[statStyles.value, { color }]}>{value}</Text>
        <Text style={statStyles.label}>{label}</Text>
      </View>
    </View>
  );
}

const statStyles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: T.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: T.cardBorder,
    flex: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  value: { fontSize: 18, fontWeight: "800" },
  label: { color: T.textSecondary, fontSize: 10, marginTop: 1 },
});

// ─── Overview Card ──────────────────────────────────────────────────────────────
type CardConfig = {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  dimColor: string;
  count: number;
};

function OverviewCard({ card }: { card: CardConfig }) {
  return (
    <View
      style={[
        overviewStyles.card,
        { borderColor: card.color + "30" },
      ]}
    >
      {/* Subtle glow background */}
      <View
        style={[
          overviewStyles.glow,
          { backgroundColor: card.dimColor },
        ]}
      />
      <View
        style={[
          overviewStyles.iconWrap,
          { backgroundColor: card.color + "20", borderColor: card.color + "40" },
        ]}
      >
        <MaterialIcons name={card.icon} size={18} color={card.color} />
      </View>
      <Text style={[overviewStyles.count, { color: card.color }]}>{card.count}</Text>
      <Text style={overviewStyles.title}>{card.title}</Text>
    </View>
  );
}

const overviewStyles = StyleSheet.create({
  card: {
    width: (width - 48) / 2,
    backgroundColor: T.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  glow: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
  },
  count: { fontSize: 26, fontWeight: "800", marginBottom: 4 },
  title: { color: T.textSecondary, fontSize: 12, lineHeight: 16 },
});

// ─── Progress Arc ───────────────────────────────────────────────────────────────
function ProgressBar({ percent }: { percent: number }) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: percent,
      duration: 1200,
      delay: 400,
      useNativeDriver: false,
    }).start();
  }, []);

  return (
    <View style={progressStyles.track}>
      <Animated.View
        style={[
          progressStyles.fill,
          {
            width: width.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
      <View style={progressStyles.shine} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: T.textMuted,
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  fill: {
    height: "100%",
    backgroundColor: T.accent,
    borderRadius: 4,
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 4,
  },
});

// ─── Quick Action ───────────────────────────────────────────────────────────────
function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={qaStyles.btn} onPress={onPress} activeOpacity={0.75}>
      <View style={[qaStyles.icon, { backgroundColor: color + "18", borderColor: color + "35" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={qaStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const qaStyles = StyleSheet.create({
  btn: { alignItems: "center", gap: 7, flex: 1 },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  label: { color: T.textSecondary, fontSize: 11, textAlign: "center" },
});

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();

  const cards: CardConfig[] = [
    { title: t("home.my_tasks"), icon: "check-circle", color: T.accent, dimColor: T.accentGlow, count: 0 },
    { title: t("home.urgent"), icon: "error", color: T.red, dimColor: T.redDim, count: 0 },
    { title: t("home.active_projects"), icon: "folder", color: T.green, dimColor: T.greenDim, count: 0 },
    { title: t("home.due_soon"), icon: "schedule", color: T.orange, dimColor: T.orangeDim, count: 0 },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* ── Header ── */}
          <AnimatedCard delay={0} style={styles.header}>
            <View>
              <Text style={styles.hello}>{t("home.hello")} 👋</Text>
              <Text style={styles.name}>Raoul Forba</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.bellBtn} activeOpacity={0.8}>
                <Ionicons name="notifications-outline" size={20} color={T.textPrimary} />
                <View style={styles.notifDot} />
              </TouchableOpacity>
              <View style={styles.avatarSmall}>
                <Text style={styles.avatarSmallText}>R</Text>
              </View>
            </View>
          </AnimatedCard>

          {/* ── Progress Card ── */}
          <AnimatedCard delay={80}>
            <View style={styles.progressCard}>
              {/* Top accent stripe */}
              <View style={styles.progressStripe} />

              <View style={styles.progressTop}>
                <View>
                  <Text style={styles.progressLabel}>{t("home.global_progress")}</Text>
                  <Text style={styles.progressSub}>Mis à jour aujourd'hui</Text>
                </View>
                <View style={styles.percentBadge}>
                  <Text style={styles.percentText}>0%</Text>
                </View>
              </View>

              <ProgressBar percent={0} />

              <View style={styles.statsRow}>
                <StatPill value={0} label={t("home.completed")} color={T.green} />
                <View style={{ width: 8 }} />
                <StatPill value={0} label={t("home.in_progress")} color={T.orange} />
                <View style={{ width: 8 }} />
                <StatPill value={0} label={t("home.todo")} color={T.accent} />
              </View>
            </View>
          </AnimatedCard>

          {/* ── Quick Actions ── */}
          <AnimatedCard delay={160}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Actions rapides</Text>
              <View style={styles.quickActions}>
                <QuickAction
                  icon="add-circle-outline"
                  label="Nouvelle tâche"
                  color={T.accent}
                  onPress={() => router.push("/(tabs)/Home/tasks")}
                />
                <QuickAction
                  icon="chatbubble-outline"
                  label="Message"
                  color={T.purple}
                  onPress={() => router.push("/(tabs)/Home/new-message")}
                />
                <QuickAction
                  icon="folder-open-outline"
                  label="Projet"
                  color={T.green}
                  onPress={() => router.push("/(tabs)/Home/new-projet")}
                />
                <QuickAction
                  icon="document-text-outline"
                  label="Rapport"
                  color={T.orange}
                  onPress={() => router.push("/(tabs)/Home/new-report")}
                />
              </View>
            </View>
          </AnimatedCard>

          {/* ── Overview Grid ── */}
          <AnimatedCard delay={240}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("home.overview")}</Text>
              <View style={styles.grid}>
                {cards.map((card, i) => (
                  <OverviewCard key={i} card={card} />
                ))}
              </View>
            </View>
          </AnimatedCard>

          {/* ── Recent Tasks ── */}
          <AnimatedCard delay={320}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t("home.recent_tasks")}</Text>
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/Home/tasks")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeAll}>Voir tout →</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.emptyCard}>
                <View style={styles.emptyIconRing}>
                  <Ionicons name="checkmark-done" size={28} color={T.accent} />
                </View>
                <Text style={styles.emptyTitle}>{t("home.no_task_assigned")}</Text>
                <Text style={styles.emptyHint}>
                  Appuyez sur + pour créer votre première tâche
                </Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push("/(tabs)/Home/tasks")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.emptyBtnText}>Nouvelle tâche</Text>
                </TouchableOpacity>
              </View>
            </View>
          </AnimatedCard>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* ── FAB ── */}
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/Home/tasks")}
        style={styles.fab}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  hello: { color: T.textSecondary, fontSize: 13 },
  name: {
    color: T.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.red,
    borderWidth: 1.5,
    borderColor: T.bg,
  },
  avatarSmall: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: T.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSmallText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  // Progress card
  progressCard: {
    backgroundColor: T.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: T.cardBorder,
    overflow: "hidden",
    gap: 16,
    marginBottom: 4,
  },
  progressStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: T.accent,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 4,
  },
  progressLabel: { color: T.textPrimary, fontWeight: "700", fontSize: 15 },
  progressSub: { color: T.textSecondary, fontSize: 11, marginTop: 3 },
  percentBadge: {
    backgroundColor: T.accentDim,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: T.accent + "50",
  },
  percentText: { color: T.accent, fontWeight: "800", fontSize: 15 },
  statsRow: { flexDirection: "row" },

  // Sections
  section: { marginTop: 20 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  seeAll: { color: T.accent, fontSize: 12, fontWeight: "600" },

  // Quick actions
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: T.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.cardBorder,
    padding: 18,
  },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  // Empty state
  emptyCard: {
    backgroundColor: T.card,
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: T.cardBorder,
    gap: 8,
  },
  emptyIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: T.accentGlow,
    borderWidth: 1,
    borderColor: T.accentDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: { color: T.textPrimary, fontSize: 15, fontWeight: "700" },
  emptyHint: {
    color: T.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 2,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 7,
    marginTop: 10,
  },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: T.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: T.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
});