import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useIsFocused } from "@react-navigation/native";
import { StyleSheet, Text, View, FlatList, SafeAreaView, ActivityIndicator, Platform, TouchableOpacity, Pressable, Image, TextInput } from "react-native";
import { useAppTheme } from "@/theme";
import { userService } from "@/services/userService";
import { conversationService, type Conversation as BackendConversation } from "@/services/conversationService";
import AddButton from "../../../components/AddButton";
import { websocketService } from "@/services/websocketService";
import { ChatInput } from "../../../components/ChatInput";
import { KeyboardAvoidingView } from "react-native";

// ─── Types ──────────────────────────────────────────────────────────────────

// Since we don't have a dedicated Conversation model in the backend, 
// we'll simulate it by grouping messages or using the existing Message model.
// For this prototype, we will treat each Message as a potential part of a conversation.
// A better approach would be to have a 'conversations' endpoint on the backend.

interface Conversation {
  id: string | number;
  name: string;
  avatarUrl?: string;
  lastMessage: string;
  time: string;        // ex: "18:34" ou "Hier"
  unreadCount: number;
  isGroup?: boolean;
  isFavorite?: boolean;
  isDelivered?: boolean; // double coche
  isRead?: boolean;      // double coche bleue
}

// ─── Sub-components ─────────────────────────────────────────────────────────

const Avatar = ({ uri, name, size = 52 }: { uri?: string; name: string; size?: number }) => {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const seed = name.charCodeAt(0) % 6;
  const colors = ["#25D366","#128C7E","#075E54","#34B7F1","#ECE5DD","#DCF8C6"];
  const bg = colors[seed];

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: size * 0.35 }}>
        {initials}
      </Text>
    </View>
  );
};

const Tick = ({ isRead, isDelivered }: { isRead?: boolean; isDelivered?: boolean }) => {
  const color = isRead ? "#53BDEB" : "#8696A0";
  if (isDelivered || isRead) {
    return (
      <View style={{ flexDirection: "row", marginRight: 3 }}>
        <Ionicons name="checkmark" size={14} color={color} />
        <Ionicons name="checkmark" size={14} color={color} style={{ marginLeft: -7 }} />
      </View>
    );
  }
  return <Ionicons name="checkmark" size={14} color="#8696A0" style={{ marginRight: 3 }} />;
};

const ConversationItem = ({
  item,
  onPress,
}: {
  item: Conversation;
  onPress: () => void;
}) => {
  const { theme } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: theme.border }}
      style={({ pressed }) => [
        styles.convRow,
        pressed && { backgroundColor: theme.cardBg },
      ]}
    >
      {/* Avatar */}
      <Avatar uri={item.avatarUrl} name={item.name} />

      {/* Middle */}
      <View style={styles.convMiddle}>
        <View style={styles.convTopRow}>
          <Text
            style={[styles.convName, { color: theme.textPrimary }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            style={[
              styles.convTime,
              { color: item.unreadCount > 0 ? "#25D366" : theme.textSecondary },
            ]}
          >
            {item.time}
          </Text>
        </View>

        <View style={styles.convBottomRow}>
          <View style={styles.convLastMsgRow}>
            <Tick isRead={item.isRead} isDelivered={item.isDelivered} />
            <Text
              style={[styles.convLastMsg, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
          </View>
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.unreadCount > 99 ? "99+" : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

// ─── Main screen ─────────────────────────────────────────────────────────────

type FilterTab = "all" | "unread" | "favorites" | "groups";

export default function Messages() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const styles2 = useMemo(() => createStyles(theme), [theme]);

  const [isAdmin, setIsAdmin] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [archivedCount, setArchivedCount] = useState(0);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [user, convs] = await Promise.all([
        userService.getCurrentUser(),
        conversationService.getMyConversations(),
      ]);
      
      setIsAdmin(user?.role === "admin");
      
      const mappedConvs: Conversation[] = convs.map(c => {
        let displayName = c.nom || "Discussion";
        if (c.type === 'direct' && c.participants && user) {
          const otherParticipant = c.participants.find(p => p.id_utilisateur !== user.id);
          if (otherParticipant && otherParticipant.utilisateur) {
            displayName = otherParticipant.utilisateur.nom;
          }
        }

        let lastMsgText = "";
        let lastMsgTime = new Date(c.date_creation);
        let isRead = false;
        let isDelivered = false;

        // @ts-ignore
        if (c.last_message) {
          // @ts-ignore
          lastMsgText = c.last_message.contenu;
          // @ts-ignore
          lastMsgTime = new Date(c.last_message.date_envoi);
          // @ts-ignore
          if (c.last_message.id_expediteur === user.id) {
            // @ts-ignore
            isRead = c.last_message.statut === "lu";
            // @ts-ignore
            isDelivered = c.last_message.statut === "distribue" || c.last_message.statut === "lu";
          }
        }

        const timeStr = lastMsgTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return {
          id: c.id_conversation,
          name: displayName,
          lastMessage: lastMsgText,
          time: timeStr,
          // @ts-ignore
          unreadCount: c.unread_count || 0,
          isGroup: c.type === 'groupe',
          isFavorite: false,
          isRead: isRead,
          isDelivered: isDelivered,
        };
      });
      
      setConversations(mappedConvs);
    } catch (e) {
      console.error("Messages fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      fetchAll();
    }
  }, [isFocused, fetchAll]);

  // ── WebSocket Live Updates ──
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    const fetchUserAndConnect = async () => {
      try {
        const u = await userService.getCurrentUser();
        if (u) {
          if (!websocketService.isConnected()) {
            await websocketService.connect(u.id);
          }
          
          const unsubscribe = websocketService.subscribe((msg) => {
            if (msg.type === "NEW_MESSAGE") {
              setConversations((prev) => {
                const updated = prev.map((c) => {
                  if (c.id === msg.id_conversation) {
                    return {
                      ...c,
                      lastMessage: msg.contenu!,
                      time: new Date(msg.date_envoi!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      unreadCount: msg.id_expediteur !== u.id ? c.unreadCount + 1 : c.unreadCount,
                      isRead: false,
                      isDelivered: msg.id_expediteur === u.id && (msg.statut === "distribue" || msg.statut === "lu"),
                    };
                  }
                  return c;
                });
                
                const exists = prev.some((c) => c.id === msg.id_conversation);
                if (!exists) {
                  fetchAll();
                }
                
                return updated;
              });
            } else if (msg.type === "MESSAGE_STATUS_UPDATE") {
              setConversations((prev) => {
                return prev.map((c) => {
                  if (c.id === msg.id_conversation) {
                    return {
                      ...c,
                      isRead: msg.statut === "lu",
                      isDelivered: msg.statut === "distribue" || msg.statut === "lu",
                    };
                  }
                  return c;
                });
              });
            }
          });
          
          cleanup = unsubscribe;
        }
      } catch (e) {
        console.error("Error in messages list ws connection:", e);
      }
    };
    
    fetchUserAndConnect();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [fetchAll]);

  // ── Filtering ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = conversations;

    if (activeTab === "unread") list = list.filter((c) => c.unreadCount > 0);
    else if (activeTab === "favorites") list = list.filter((c) => c.isFavorite);
    else if (activeTab === "groups") list = list.filter((c) => c.isGroup);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q)
      );
    }

    return list;
  }, [conversations, activeTab, search]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const openConversation = useCallback(
    (conv: Conversation) => {
      // Navigate to the actual chat screen with the conversation ID
      router.push({
        pathname: "/(tabs)/Home/conversation",
        params: { id: conv.id.toString(), name: conv.name },
      });
    },
    [router]
  );


  // ── Tabs ─────────────────────────────────────────────────────────────────

  const TABS: { key: FilterTab; label: string }[] = [
    { key: "all", label: t("messages.tab.all", "Toutes") },
    { key: "unread", label: t("messages.tab.unread", "Non lues") },
    { key: "favorites", label: t("messages.tab.favorites", "Favoris") },
    { key: "groups", label: t("messages.tab.groups", "Groupes") },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles2.root, { backgroundColor: theme.bg }]}>

      {/* ── Header ── */}
      <View style={[styles2.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles2.headerTitle, { color: theme.textPrimary }]}>
          {t("messages.title", "Discussions")}
        </Text>
        
        <View style={styles2.headerIcons}>
          <TouchableOpacity
            style={styles2.headerBtn}
            onPress={() => router.push("/(tabs)/Home/qr-code")}
          >
            <Ionicons name="camera-outline" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles2.headerBtn}
           onPress={() => router.push("/(tabs)/Home/settings")}
          >
            <Ionicons name="ellipsis-vertical" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={styles2.searchWrapper}>
        <View style={[styles2.searchBar, { backgroundColor: theme.cardBg }]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("messages.search", "Demander ou rechercher")}
            placeholderTextColor={theme.textSecondary}
            style={[styles2.searchInput, { color: theme.textPrimary }]}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filter tabs ── */}
      <View style={styles2.tabsRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TABS}
          keyExtractor={(t) => t.key}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
          renderItem={({ item }) => {
            const active = activeTab === item.key;
            return (
              <TouchableOpacity
                onPress={() => setActiveTab(item.key)}
                style={[
                  styles2.tab,
                  active
                    ? { backgroundColor: "#25D366" }
                    : { backgroundColor: theme.cardBg },
                ]}
              >
                <Text
                  style={[
                    styles2.tabText,
                    { color: active ? "#fff" : theme.textSecondary },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        {/* "+" tab button */}
        <TouchableOpacity
          style={[styles2.tabAdd, { backgroundColor: theme.cardBg }]}
          /*onPress={() => router.push("/(tabs)/Home/new-group")} */
        >
          <Ionicons name="add" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Conversation list ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          archivedCount > 0 ? (
            <TouchableOpacity
              style={[styles2.archivedRow, { borderBottomColor: theme.border }]}
              /* onPress={() => router.push("/(tabs)/Home/archived")} */
            >
              <Ionicons name="archive-outline" size={22} color="#8696A0" style={{ marginRight: 14 }} />
              <Text style={[styles2.archivedLabel, { color: theme.textPrimary }]}>
                {t("messages.archived", "Archivées")}
              </Text>
              <Text style={styles2.archivedCount}>{archivedCount}</Text>
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item }) => (
          <ConversationItem item={item} onPress={() => openConversation(item)} />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles2.empty}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles2.emptyText, { color: theme.textSecondary }]}>
                {search
                  ? t("messages.noResults", "Aucun résultat")
                  : t("messages.empty", "Aucune conversation")}
              </Text>
            </View>
          ) : (
            <View style={styles2.empty}>
               <ActivityIndicator size="small" color={theme.accent} />
            </View>
          )
        }
        contentContainerStyle={{ flexGrow: 1 }}
        ItemSeparatorComponent={() => (
          <View style={[styles2.separator, { backgroundColor: theme.border }]} />
        )}
      />

      {/* ── FABs ── */}
      <View style={styles2.fabContainer}>
        <TouchableOpacity
          style={[styles2.fab, { backgroundColor: "#25D366" }]}
          onPress={() => router.push("/(tabs)/Home/new-group")}
          activeOpacity={0.85}
        >
          <Ionicons name="people-outline" size={26} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles2.fab, { backgroundColor: "#25D366" }]}
          onPress={() => router.push("/(tabs)/Home/new-message")}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (theme: any) =>
  StyleSheet.create({
    root: { flex: 1 },

    // Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: { fontSize: 22, fontWeight: "700", letterSpacing: 0.2 },
    headerIcons: { flexDirection: "row", gap: 4 },
    headerBtn: { padding: 6 },

    // Search
    searchWrapper: { paddingHorizontal: 12, paddingVertical: 8 },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    searchInput: { flex: 1, fontSize: 15 },

    // Tabs
    tabsRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },
    tab: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
    },
    tabText: { fontSize: 13, fontWeight: "600" },
    tabAdd: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      marginLeft: 4,
    },

    // Archived row
    archivedRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    archivedLabel: { flex: 1, fontSize: 17 },
    archivedCount: { color: "#8696A0", fontSize: 14 },

    // Conversation row  (shared across static + dynamic)
    separator: { height: StyleSheet.hairlineWidth, marginLeft: 82 },

    // Empty state
    empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 40 },
    emptyText: { fontSize: 16 },

    // FABs
    fabContainer: {
      position: "absolute",
      bottom: 24,
      right: 20,
      gap: 12,
      alignItems: "center",
    },
    fab: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: "center",
      justifyContent: "center",
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
  });

// Styles statiques pour ConversationItem (définis en dehors pour éviter les recréations)
const styles = StyleSheet.create({
  convRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  convMiddle: { flex: 1 },
  convTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  convName: { fontSize: 17, fontWeight: "600", flex: 1, marginRight: 8 },
  convTime: { fontSize: 12 },
  convBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  convLastMsgRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  convLastMsg: { fontSize: 14, flex: 1 },
  badge: {
    backgroundColor: "#25D366",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    marginLeft: 6,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
