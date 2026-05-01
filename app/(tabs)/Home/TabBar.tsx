import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../../theme";

// ─── Tab Icon ──────────────────────────────────────────────────────────────────
type TabIconProps = {
  icon: React.ReactNode;
  label: string;
  focused: boolean;
  color: string;
};

const TabIcon = ({ icon, label, focused, color }: TabIconProps) => {
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
      <Tabs.Screen name="new-projet" options={{ href: null }} />
      <Tabs.Screen name="new-report" options={{ href: null }} />
      <Tabs.Screen name="new-tasks" options={{ href: null }} />
      <Tabs.Screen name="TabBar" options={{ href: null }} />

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
});
