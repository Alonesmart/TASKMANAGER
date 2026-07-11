import { projectService } from "@/services/projectService";
import { userService } from "@/services/userService";
import { homeService } from "@/services/homeService";
import { messageService } from "@/services/messageService";
import { AppTheme, useAppTheme } from "@/theme";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
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

type HomePalette = {
  bg: string;
  surface: string;
  card: string;
  cardBorder: string;
  accent: string;
  accentGlow: string;
  accentDim: string;
  green: string;
  greenDim: string;
  orange: string;
  orangeDim: string;
  red: string;
  redDim: string;
  purple: string;
  purpleDim: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
};

const createPalette = (theme: AppTheme): HomePalette => ({
  bg: theme.bg,
  surface: theme.surface,
  card: theme.cardBg,
  cardBorder: theme.border,
  accent: theme.accent,
  accentGlow: theme.accentGlow,
  accentDim: theme.accentDim,
  green: "#2dd4a0",
  greenDim: "#2dd4a015",
  orange: "#ff9f43",
  orangeDim: "#ff9f4315",
  red: "#ff6b6b",
  redDim: "#ff6b6b15",
  purple: "#a78bfa",
  purpleDim: "#a78bfa15",
  textPrimary: theme.textPrimary,
  textSecondary: theme.textSecondary,
  textMuted: theme.textMuted,
});

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
  }, [delay, opacity, translateY]);

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
  styles,
}: {
  value: number;
  label: string;
  color: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.pill}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View>
        <Text style={[styles.value, { color }]}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

// ─── Overview Card ──────────────────────────────────────────────────────────────
type CardConfig = {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  dimColor: string;
  count: number;
};

function OverviewCard({ card, styles }: { card: CardConfig; styles: ReturnType<typeof createStyles> }) {
  return (
    <View
      style={[
        styles.card,
        { borderColor: card.color + "30" },
      ]}
    >
      {/* Subtle glow background */}
      <View
        style={[
          styles.glow,
          { backgroundColor: card.dimColor },
        ]}
      />
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: card.color + "20", borderColor: card.color + "40" },
        ]}
      >
        <MaterialIcons name={card.icon} size={18} color={card.color} />
      </View>
      <Text style={[styles.count, { color: card.color }]}>{card.count}</Text>
      <Text style={styles.title}>{card.title}</Text>
    </View>
  );
}

// ─── Progress Arc ───────────────────────────────────────────────────────────────
function ProgressBar({ percent, styles }: { percent: number; styles: ReturnType<typeof createStyles> }) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: percent,
      duration: 1200,
      delay: 400,
      useNativeDriver: false,
    }).start();
  }, [percent, width]);

  return (
    <View style={styles.track}>
      <Animated.View
        style={[
          styles.fill,
          {
            width: width.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
      <View style={styles.shine} />
    </View>
  );
}

// ─── Quick Action ───────────────────────────────────────────────────────────────
function QuickAction({
  icon,
  label,
  color,
  onPress,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress?: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.icon, { backgroundColor: color + "18", borderColor: color + "35" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme, isDark } = useAppTheme();
  const T = useMemo(() => createPalette(theme), [theme]);
  const styles = useMemo(() => createStyles(T), [T]);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{nom: string, role: string} | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState({
    activeProjects: 0,
    myTasks: 0,
    urgentTasks: 0,
    dueSoonTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    todoTasks: 0,
    progression: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await homeService.getDashboardData();
      
      setStats({
        activeProjects: data.active_projects,
        myTasks: data.my_tasks,
        urgentTasks: data.urgent_tasks,
        dueSoonTasks: data.due_soon_tasks,
        completedTasks: data.completed_tasks,
        inProgressTasks: data.in_progress_tasks,
        todoTasks: data.todo_tasks,
        progression: data.progression,
      });

      const curUser = await userService.getCurrentUser();
      const countRes = await messageService.getUnreadNotificationsCount(curUser.id);
      setUnreadCount(countRes.count);
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => { // Renamed to init for clarity
      setLoading(true);
      try {
        const userData = await userService.getCurrentUser();
        setUser(userData);
        await fetchData();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      void fetchData();
    }, [fetchData])
  );

  const cards: CardConfig[] = [
    { title: t("home.my_tasks"), icon: "check-circle", color: T.accent, dimColor: T.accentGlow, count: stats.myTasks },
    { title: t("home.urgent"), icon: "error", color: T.red, dimColor: T.redDim, count: stats.urgentTasks },
    { title: t("home.active_projects"), icon: "folder", color: T.green, dimColor: T.greenDim, count: stats.activeProjects },
    { title: t("home.due_soon"), icon: "schedule", color: T.orange, dimColor: T.orangeDim, count: stats.dueSoonTasks },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={T.bg} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* ── Header ── */}
          <AnimatedCard delay={0} style={styles.header}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.hello}>{t("home.hello")}</Text>
                <Ionicons name="hand-right-outline" size={16} color={T.orange} />
              </View>
              <Text style={styles.name}>{user?.nom || "Utilisateur"}</Text>
            </View>
            <View style={styles.headerRight}>
              {loading && <ActivityIndicator size="small" color={T.accent} style={{ marginRight: 8 }} />}
              <TouchableOpacity 
                style={styles.bellBtn} 
                activeOpacity={0.8}
                onPress={() => router.push("/(tabs)/Home/notifications")}
              >
                <Ionicons name="notifications-outline" size={20} color={T.textPrimary} />
                {unreadCount > 0 && (
                  <View style={styles.notifDot}>
                    <Text style={{ color: "#fff", fontSize: 8, fontWeight: "bold", textAlign: "center", lineHeight: 10 }}>
                      {unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.avatarSmall}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => router.push("/(tabs)/Home/profile")}>
                <Text style={styles.avatarSmallText}>{user?.nom?.charAt(0).toUpperCase() || "U"}</Text>
                </TouchableOpacity>
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
                  <Text style={styles.progressSub}>{t("home.updated_today")}</Text>
                </View>
                <View style={styles.percentBadge}>
                  <Text style={styles.percentText}>{stats.progression}%</Text>
                </View>
              </View>

              <ProgressBar percent={stats.progression} styles={styles} />

              <View style={styles.statsRow}>
                <StatPill value={stats.completedTasks} label={t("home.completed")} color={T.green} styles={styles} />
                <View style={{ width: 8 }} />
                <StatPill value={stats.inProgressTasks} label={t("home.in_progress")} color={T.orange} styles={styles} />
                <View style={{ width: 8 }} />
                <StatPill value={stats.todoTasks} label={t("home.todo")} color={T.accent} styles={styles} />
              </View>
            </View>
          </AnimatedCard>

          {/* ── Quick Actions ── */}
          <AnimatedCard delay={160}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("home.quick_actions")}</Text>
              <View style={styles.quickActions}>
                <QuickAction
                  icon="add-circle-outline"
                  label={t("home.new_task")}
                  color={T.accent}
                  onPress={() => router.push("/(tabs)/Home/tasks")}
                  styles={styles}
                />
                <QuickAction
                  icon="chatbubble-outline"
                  label={t("home.message")}
                  color={T.purple}
                  onPress={() => router.push("/(tabs)/Home/new-message")}
                  styles={styles}
                />
                {user?.role === 'admin' && (
                  <QuickAction
                    icon="folder-open-outline"
                    label={t("home.project")}
                    color={T.green}
                    onPress={() => router.push("/(tabs)/Home/new-projet")}
                    styles={styles}
                  />
                )}
                <QuickAction
                  icon="document-text-outline"
                  label={t("home.report")}
                  color={T.orange}
                  onPress={() => router.push("/(tabs)/Home/new-report")}
                  styles={styles}
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
                  <TouchableOpacity 
                    key={i} 
                    activeOpacity={0.7} 
                    onPress={() => {
                      if (card.title === t("home.active_projects")) {
                        router.push("/(tabs)/Home/projects");
                      } else if (card.title === t("home.my_tasks") || card.title === t("home.urgent") || card.title === t("home.due_soon")) {
                        router.push("/(tabs)/Home/tasks");
                      }
                    }}
                  >
                    <OverviewCard card={card} styles={styles} />
                  </TouchableOpacity>
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
                  <Text style={styles.seeAll}>{t("home.see_all")}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.emptyCard}>
                <View style={styles.emptyIconRing}>
                  <Ionicons name="checkmark-done" size={28} color={T.accent} />
                </View>
                <Text style={styles.emptyTitle}>{t("home.no_task_assigned")}</Text>
                <Text style={styles.emptyHint}>{t("home.empty_hint")}</Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push("/(tabs)/Home/tasks")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.emptyBtnText}>{t("home.new_task")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </AnimatedCard>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const createStyles = (T: HomePalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
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
  label: { color: T.textSecondary, fontSize: 11, marginTop: 1, textAlign: "center" },
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
  btn: { alignItems: "center", gap: 7, flex: 1 },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

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
    top: 2,
    right: 2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: T.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
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

});
