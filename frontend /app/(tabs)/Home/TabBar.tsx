import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/theme";
import { conversationService } from "@/services/conversationService";
import { websocketService } from "@/services/websocketService";
import { userService } from "@/services/userService";
import { projectService } from "@/services/projectService";
import { reportService } from "@/services/reportService";

// ─── Tab Icon ──────────────────────────────────────────────────────────────────
type TabIconProps = {
  icon: React.ReactNode;
  label: string;
  focused: boolean;
  color: string;
  badgeCount?: number;
};

const TabIcon = ({ icon, label, focused, color, badgeCount }: TabIconProps) => {
  const { theme } = useAppTheme();

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.iconWrap,
          focused && { backgroundColor: theme.activeBg, borderColor: color + "30" },
        ]}
      >
        {focused && <View style={[styles.topPill, { backgroundColor: color }]} />}
        {icon}
        {badgeCount && badgeCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badgeCount > 99 ? "99+" : badgeCount}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        style={[
          styles.label,
          { color: focused ? color : theme.inactive },
          focused && styles.labelActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

// ─── Layout ────────────────────────────────────────────────────────────────────
export default function TabsLayout() {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [toValidateCount, setToValidateCount] = useState(0);
  const [tasksToValidateCount, setTasksToValidateCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const convs = await conversationService.getMyConversations();
      const count = convs.reduce((sum, c) => sum + (c.unread_count || 0), 0);
      setUnreadMessages(count);
    } catch (e) {
      console.error("Failed to fetch unread count:", e);
    }
  }, []);

  const fetchReportsToValidateCount = useCallback(async () => {
    try {
      const user = await userService.getCurrentUser();
      const projects = await projectService.getProjects();
      const hasManagerRole = projects.some(p => p.id_administrateur === user?.id) || user?.role === "admin";
      if (hasManagerRole || user?.role === "admin") {
        const toVal = await reportService.getReportsToValidate();
        setToValidateCount(toVal.length);
      } else {
        setToValidateCount(0);
      }
    } catch (e) {
      console.log("Failed to fetch reports to validate count:", e);
      setToValidateCount(0);
    }
  }, []);

  const fetchTasksToValidateCount = useCallback(async () => {
    try {
      const user = await userService.getCurrentUser();
      const currentUid = user?.id;
      const isUserAdmin = user?.role === "admin";
      
      const tasks = await projectService.getTasks();
      
      let count = 0;
      const cache: Record<number, any[]> = {};
      const invitationService = require("../../../services/invitationService").invitationService;

      for (const t of tasks) {
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
              console.error(err);
            }
          }
          if (canVal) {
            count++;
          }
        }
      }
      setTasksToValidateCount(count);
    } catch (e) {
      console.log("Failed to fetch tasks to validate count:", e);
      setTasksToValidateCount(0);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    fetchReportsToValidateCount();
    fetchTasksToValidateCount();

    const unsubscribe = websocketService.subscribe((msg) => {
      if (msg.type === "NEW_MESSAGE" || msg.type === "MESSAGE_STATUS_UPDATE") {
        fetchUnreadCount();
      }
      if (msg.type === "NEW_NOTIFICATION") {
        fetchReportsToValidateCount();
        fetchTasksToValidateCount();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fetchUnreadCount, fetchReportsToValidateCount]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.inactive,
        tabBarShowLabel: false,
        tabBarItemStyle: { flex: 1 },
        tabBarStyle: {
          backgroundColor: theme.bar,
          height: Platform.OS === "ios" ? 82 : 66,
          borderTopWidth: 1,
          borderTopColor: theme.barBorder,
          paddingBottom: 0,
          paddingTop: 0,
          elevation: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        },
      }}
    >
      {/* ── Hidden screens ── */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="new-message" options={{ href: null }} />
      <Tabs.Screen name="new-group" options={{ href: null }} />
      <Tabs.Screen name="group-details" options={{ href: null }} />
      <Tabs.Screen name="new-projet" options={{ href: null }} />
      <Tabs.Screen name="new-report" options={{ href: null }} />
      <Tabs.Screen name="new-tasks" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="TabBar" options={{ href: null }} />
      <Tabs.Screen name="conversation" options={{ href: null }} />

      {/* ── Home ── */}
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              label={t("tabs.home")}
              icon={<Ionicons name={focused ? "home" : "home-outline"} size={21} color={color} />}
            />
          ),
        }}
      />

      {/* ── Projects ── */}
      <Tabs.Screen
        name="projects"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              label={t("tabs.projects")}
              icon={
                <Ionicons
                  name={focused ? "folder" : "folder-outline"}
                  size={21}
                  color={color}
                />
              }
            />
          ),
        }}
      />

      {/* ── Tasks ── */}
      <Tabs.Screen
        name="tasks"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              label={t("tabs.tasks")}
              badgeCount={tasksToValidateCount}
              icon={
                <Ionicons
                  name={focused ? "checkbox" : "checkbox-outline"}
                  size={21}
                  color={color}
                />
              }
            />
          ),
        }}
      />

      {/* ── Video ── */}
      <Tabs.Screen
        name="video"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              label={t("tabs.video")}
              icon={
                <Ionicons
                  name={focused ? "videocam" : "videocam-outline"}
                  size={21}
                  color={color}
                />
              }
            />
          ),
        }}
      />

      {/* ── Messages ── */}
      <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              label={t("tabs.messages")}
              badgeCount={unreadMessages}
              icon={
                <Ionicons
                  name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"}
                  size={21}
                  color={color}
                />
              }
            />
          ),
        }}
      />
      {/* ── Reports ── */}
      <Tabs.Screen
        name="reports"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              label={t("tabs.reports")}
              badgeCount={toValidateCount}
              icon={
                <Ionicons
                  name={focused ? "stats-chart" : "stats-chart-outline"}
                  size={21}
                  color={color}
                />
              }
            />
          ),
        }}
      />

      {/* ── Profile ── */}
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              label={t("tabs.profile")}
              icon={
                <Ionicons
                  name={focused ? "person" : "person-outline"}
                  size={21}
                  color={color}
                />
              }
            />
          ),
        }}
      />
    </Tabs>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 6,
    width: "100%",
    gap: 3,
  },
  iconWrap: {
    width: 44,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    position: "relative",
    overflow: "hidden",
  },
  topPill: {
    position: "absolute",
    top: 0,
    width: 20,
    height: 2.5,
    borderRadius: 2,
  },
  label: {
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  labelActive: {
    fontWeight: "700",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#d92d20",
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  badgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "700",
  },
});
