import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, View, Text, FlatList, SafeAreaView, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppTheme } from "@/theme";
import { conversationService } from "@/services/conversationService";
import { userService } from "@/services/userService";
import { messageService } from "@/services/messageService";
import { MessageBubble } from "@/components/MessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { websocketService } from "@/services/websocketService";

interface Message {
  id_message: number;
  contenu: string;
  id_expediteur: number;
  date_envoi: string;
}

export default function ConversationScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { theme } = useAppTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const msgs = await conversationService.getMessages(parseInt(id));
      setMessages(msgs);
    } catch (e) {
      console.error("Error fetching messages:", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const init = async () => {
      try {
        const u = await userService.getCurrentUser();
        setCurrentUserId(u.id);
      } catch (e) {
        console.error("Error fetching current user:", e);
      }
      fetchMessages();
    };
    init();
  }, [fetchMessages]);

  useEffect(() => {
    if (!currentUserId) return;

    if (!websocketService.isConnected()) {
      websocketService.connect(currentUserId).catch((err) => {
        console.log("[WebSocket] Connection failed:", err);
      });
    }

    const unsubscribe = websocketService.subscribe((msg) => {
      if (msg.type === "NEW_MESSAGE" && msg.id_conversation === parseInt(id)) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id_message === msg.id_message);
          if (exists) return prev;
          return [
            ...prev,
            {
              id_message: msg.id_message!,
              contenu: msg.contenu!,
              id_expediteur: msg.id_expediteur!,
              date_envoi: msg.date_envoi!,
            },
          ];
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUserId, id]);

  const handleSend = async (text: string) => {
    if (!text.trim() || !currentUserId) return;
    try {
      const newMsg = await messageService.sendMessage({
        contenu: text.trim(),
        type_conversation: "direct",
        id_expediteur: currentUserId,
        id_conversation: parseInt(id)
      });
      setMessages((prev) => [...prev, newMsg]);
    } catch (e) {
      console.error("Error sending message:", e);
      Alert.alert("Erreur", "Impossible d'envoyer le message.");
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Text style={{ color: theme.textPrimary, fontSize: 18, fontWeight: 'bold' }}>{name}</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={theme.accent} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id_message.toString()}
          renderItem={({ item }) => (
            <MessageBubble
              message={{
                contenu: item.contenu,
                date_envoi: item.date_envoi,
                id_expediteur: item.id_expediteur,
                currentUserId: currentUserId || 0,
              }}
            />
          )}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
      <ChatInput onSend={handleSend} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1, borderColor: '#ccc' },
});
