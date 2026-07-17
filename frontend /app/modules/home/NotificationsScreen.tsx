import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/theme";
import { messageService, Notification } from "@/services/messageService";
import { userService } from "@/services/userService";

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const T = useMemo(() => ({
    bg: theme.bg,
    surface: theme.surface,
    card: theme.cardBg,
    border: theme.border,
    accent: theme.accent,
    textPrimary: theme.textPrimary,
    textSecondary: theme.textSecondary,
    textMuted: theme.textMuted,
    orange: "#ff9f43",
    orangeDim: "#ff9f4315",
    blue: "#38bdf8",
    blueDim: "#38bdf815",
    green: "#2dd4a0",
    greenDim: "#2dd4a015",
  }), [theme]);

  const loadNotifications = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const curUser = await userService.getCurrentUser();
      const data = await messageService.getNotifications(curUser.id);
      setNotifications(data);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications(false);
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await messageService.markNotificationAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id_notification === id ? { ...n, lu: true } : n)
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleNotificationPress = async (item: Notification) => {
    try {
      await handleMarkAsRead(item.id_notification);
      if (item.id_tache) {
        router.push("/(tabs)/Home/tasks");
      }
    } catch (error) {
      console.error("Error handling notification press:", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.lu);
      await Promise.all(unread.map(n => messageService.markNotificationAsRead(n.id_notification)));
      setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const getNotificationStyle = (item: Notification) => {
    const isDeadline = item.message.includes("heures") || (item.id_tache !== undefined && item.id_tache !== null);
    const isComment = item.message.includes("commenté");
    const isAssign = item.message.includes("assigné");

    let iconName: keyof typeof Ionicons.glyphMap = "notifications-outline";
    let iconColor = T.accent;
    let cardBorder = T.border;
    let iconBg = T.surface;

    if (isDeadline) {
      iconName = "time-outline";
      iconColor = T.orange;
      iconBg = T.orangeDim;
      if (!item.lu) {
        cardBorder = T.orange;
      }
    } else if (isComment) {
      iconName = "chatbubble-ellipses-outline";
      iconColor = T.blue;
      iconBg = T.blueDim;
    } else if (isAssign) {
      iconName = "person-add-outline";
      iconColor = T.green;
      iconBg = T.greenDim;
    }

    return { iconName, iconColor, cardBorder, iconBg };
  };

  const formatDate = (dateStr: string) => {
    try {
      const dateVal = new Date(dateStr);
      return dateVal.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const { iconName, iconColor, cardBorder, iconBg } = getNotificationStyle(item);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { borderColor: cardBorder },
          !item.lu && styles.unreadCard
        ]}
        activeOpacity={0.8}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={22} color={iconColor} />
        </View>

        <View style={styles.contentContainer}>
          <Text style={[styles.messageText, !item.lu && styles.unreadText]}>
            {item.message}
          </Text>
          <Text style={styles.dateText}>{formatDate(item.date_envoi)}</Text>
        </View>

        {!item.lu && (
          <TouchableOpacity
            style={styles.checkBtn}
            onPress={() => handleMarkAsRead(item.id_notification)}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={T.textMuted} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: T.bg }]} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={24} color={T.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("notifications.title", "Notifications")}</Text>
        
        {notifications.some(n => !n.lu) ? (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>{t("notifications.mark_all_read", "Tout lire")}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.accent} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={64} color={T.textMuted} />
          <Text style={styles.emptyText}>{t("notifications.empty", "Aucune notification")}</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id_notification.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  markAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
  },
  markAllText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.4)",
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  unreadCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    gap: 4,
  },
  messageText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 20,
  },
  unreadText: {
    color: "#fff",
    fontWeight: "500",
  },
  dateText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
  },
  checkBtn: {
    padding: 4,
    marginLeft: 8,
  },
});
