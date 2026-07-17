import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, View, Text, FlatList, SafeAreaView, ActivityIndicator, Alert, TouchableOpacity, Modal, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppTheme } from "@/theme";
import { conversationService } from "@/services/conversationService";
import { userService } from "@/services/userService";
import { messageService } from "@/services/messageService";
import { MessageBubble } from "@/components/MessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { websocketService } from "@/services/websocketService";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { documentService } from "@/services/documentService";
import { Ionicons } from "@expo/vector-icons";

interface Message {
  id_message: number;
  contenu: string;
  id_expediteur: number;
  date_envoi: string;
  statut?: string;
  expediteur?: {
    id: number;
    nom: string;
    email: string;
    role: string;
  };
}

export default function ConversationScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { theme } = useAppTheme();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [otherParticipant, setOtherParticipant] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Edit message states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editMessageText, setEditMessageText] = useState("");

  const fetchMessages = useCallback(async () => {
    try {
      const [msgs, convDetails] = await Promise.all([
        conversationService.getMessages(parseInt(id)),
        conversationService.getConversation(parseInt(id)),
      ]);
      setMessages(msgs);
      setConversation(convDetails);

      const currentU = await userService.getCurrentUser();
      if (convDetails.participants && currentU) {
        const other = convDetails.participants.find(
          (p) => p.id_utilisateur !== currentU.id
        );
        if (other) {
          setOtherParticipant(other);
        }
      }

      // Marquer tous les messages comme lus à l'ouverture
      try {
        await conversationService.markAsRead(parseInt(id));
      } catch (err) {
        console.log("Error marking conversation read on load:", err);
      }
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

          // Si on est dans le chat, marquer immédiatement le message comme lu
          if (msg.id_expediteur !== currentUserId) {
            conversationService.markAsRead(parseInt(id)).catch((err) => {
              console.log("Error marking message read on receive:", err);
            });
          }

          return [
            ...prev,
            {
              id_message: msg.id_message!,
              contenu: msg.contenu!,
              id_expediteur: msg.id_expediteur!,
              date_envoi: msg.date_envoi!,
              statut: msg.statut!,
              expediteur: (msg as any).expediteur,
            },
          ];
        });
      } else if (msg.type === "PRESENCE_STATUS") {
        setOtherParticipant((prev: any) => {
          if (prev && prev.id_utilisateur === msg.id_utilisateur) {
            return {
              ...prev,
              utilisateur: {
                ...prev.utilisateur,
                en_ligne: msg.en_ligne!,
                derniere_connexion: msg.en_ligne ? prev.utilisateur.derniere_connexion : new Date().toISOString(),
              },
            };
          }
          return prev;
        });
      } else if (msg.type === "TYPING_STATUS" && msg.id_conversation === parseInt(id)) {
        if (msg.id_utilisateur !== currentUserId) {
          setIsTyping(msg.is_typing!);
        }
      } else if (msg.type === "MESSAGE_STATUS_UPDATE" && msg.id_conversation === parseInt(id)) {
        setMessages((prev) => {
          return prev.map((m) => {
            if (m.id_message === msg.id_message) {
              return {
                ...m,
                statut: msg.statut,
              };
            }
            return m;
          });
        });
      } else if (msg.type === "MESSAGE_UPDATE" && msg.id_conversation === parseInt(id)) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id_message === msg.id_message
              ? { ...m, contenu: msg.contenu! }
              : m
          )
        );
      } else if (msg.type === "CONVERSATION_DELETED" && msg.id_conversation === parseInt(id)) {
        Alert.alert("Information", "Cette conversation a été supprimée.", [
          { text: "OK", onPress: () => router.dismissTo("/(tabs)/Home/messages") }
        ]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUserId, id]);

  const handleLongPressMessage = (msg: Message) => {
    Alert.alert(
      "Options du message",
      "Que souhaitez-vous faire avec ce message ?",
      [
        {
          text: "Modifier",
          onPress: () => {
            setEditingMessage(msg);
            setEditMessageText(msg.contenu);
            setEditModalVisible(true);
          }
        },
        { text: "Annuler", style: "cancel" }
      ]
    );
  };

  const handleSaveEditedMessage = async () => {
    if (!editingMessage || !editMessageText.trim()) return;
    try {
      const updated = await messageService.updateMessage(editingMessage.id_message, editMessageText.trim());
      setMessages((prev) =>
        prev.map((m) => (m.id_message === updated.id_message ? { ...m, contenu: updated.contenu } : m))
      );
      setEditModalVisible(false);
      setEditingMessage(null);
    } catch (e) {
      console.error("Failed to edit message:", e);
      Alert.alert("Erreur", "Impossible de modifier le message.");
    }
  };

  const handleHeaderOptions = () => {
    const isGroup = conversation?.type === "groupe";
    const isAdmin = conversation?.id_admin === currentUserId || currentUserId === 1;

    const options = [];
    if (isGroup) {
      options.push({
        text: "Détails du groupe",
        onPress: () => router.push({
          pathname: "/(tabs)/Home/group-details",
          params: { id: id, name: name }
        })
      });
      if (isAdmin) {
        options.push({
          text: "Supprimer le groupe",
          style: "destructive" as const,
          onPress: confirmDeleteConversation
        });
      }
    } else {
      options.push({
        text: "Supprimer la discussion",
        style: "destructive" as const,
        onPress: confirmDeleteConversation
      });
    }
    options.push({ text: "Annuler", style: "cancel" as const });

    Alert.alert("Options", "Que souhaitez-vous faire ?", options);
  };

  const confirmDeleteConversation = () => {
    Alert.alert(
      "Confirmation",
      "Voulez-vous vraiment supprimer cette discussion ? Cette action est irréversible et supprimera tous les messages.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await conversationService.deleteConversation(parseInt(id));
              Alert.alert("Succès", "Discussion supprimée.");
              router.dismissTo("/(tabs)/Home/messages");
            } catch (e) {
              console.error("Failed to delete conversation:", e);
              Alert.alert("Erreur", "Impossible de supprimer la discussion.");
            }
          }
        }
      ]
    );
  };

  const handleTyping = (isTypingVal: boolean) => {
    if (websocketService.isConnected() && currentUserId) {
      websocketService.send({
        type: "typing",
        id_conversation: parseInt(id),
        is_typing: isTypingVal,
      });
    }
  };

  const formatPresence = () => {
    if (isTyping) return "En train d'écrire...";
    if (otherParticipant?.utilisateur?.en_ligne) return "En ligne";
    if (otherParticipant?.utilisateur?.derniere_connexion) {
      const d = new Date(otherParticipant.utilisateur.derniere_connexion);
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = d.toLocaleDateString([], { day: 'numeric', month: 'short' });
      const today = new Date();
      if (d.toDateString() === today.toDateString()) {
        return `En ligne aujourd'hui à ${timeStr}`;
      }
      return `Vu le ${dateStr} à ${timeStr}`;
    }
    return "";
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || !currentUserId) return;
    try {
      const newMsg = await messageService.sendMessage({
        contenu: text.trim(),
        type_conversation: conversation?.type || "direct",
        id_expediteur: currentUserId,
        id_conversation: parseInt(id)
      });
      setMessages((prev) => {
        const exists = prev.some((m) => m.id_message === newMsg.id_message);
        if (exists) return prev;
        return [...prev, newMsg];
      });
    } catch (e) {
      console.error("Error sending message:", e);
      Alert.alert("Erreur", "Impossible d'envoyer le message.");
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;
      
      setUploading(true);
      const asset = result.assets[0];
      const fileUri = asset.uri;
      const fileName = asset.fileName || `photo-${Date.now()}.jpg`;
      const mimeType = asset.mimeType || "image/jpeg";

      const uploadedDoc = await documentService.uploadDocument(
        fileUri,
        fileName,
        mimeType
      );

      const downloadUrl = documentService.getDownloadUrl(uploadedDoc.id);
      await handleSend(`📷 [Image] ${fileName}\n${downloadUrl}`);
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Erreur", "Impossible d'envoyer l'image.");
    } finally {
      setUploading(false);
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: "*/*",
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      setUploading(true);
      const asset = result.assets[0];
      const fileUri = asset.uri;
      const fileName = asset.name;
      const mimeType = asset.mimeType || "application/octet-stream";

      const uploadedDoc = await documentService.uploadDocument(
        fileUri,
        fileName,
        mimeType
      );

      const downloadUrl = documentService.getDownloadUrl(uploadedDoc.id);
      await handleSend(`📄 [Fichier] ${fileName}\n${downloadUrl}`);
    } catch (error) {
      console.error("Error picking file:", error);
      Alert.alert("Erreur", "Impossible d'envoyer le document.");
    } finally {
      setUploading(false);
    }
  };

  const showAttachmentOptions = () => {
    Alert.alert(
      "Ajouter une pièce jointe",
      "Sélectionnez le type de document à envoyer",
      [
        { text: "📷 Image / Photo", onPress: handlePickImage },
        { text: "📄 Document / Fichier", onPress: handlePickFile },
        { text: "Annuler", style: "cancel" }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.cardBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          disabled={conversation?.type !== "groupe"}
          onPress={() => router.push({
            pathname: "/(tabs)/Home/group-details",
            params: { id: id, name: name }
          })}
          style={styles.headerInfo}
        >
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{name}</Text>
          {formatPresence() ? (
            <Text style={[styles.headerSubtitle, { color: isTyping ? theme.accent : theme.textSecondary }]}>
              {formatPresence()}
            </Text>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleHeaderOptions} style={{ padding: 6 }}>
          <Ionicons name="ellipsis-vertical" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={theme.accent} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id_message.toString()}
          renderItem={({ item }) => {
            const isMine = item.id_expediteur === currentUserId;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onLongPress={() => {
                  if (isMine) handleLongPressMessage(item);
                }}
              >
                <MessageBubble
                  message={{
                    contenu: item.contenu,
                    date_envoi: item.date_envoi,
                    id_expediteur: item.id_expediteur,
                    currentUserId: currentUserId || 0,
                    statut: item.statut,
                    nomExpediteur: conversation?.type === "groupe" ? item.expediteur?.nom : undefined,
                  }}
                />
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
      
      {uploading && (
        <View style={[styles.uploadingBar, { borderTopColor: theme.border }]}>
          <ActivityIndicator size="small" color={theme.accent} />
          <Text style={{ color: theme.textSecondary, fontSize: 13, marginLeft: 8 }}>
            Envoi du fichier en cours...
          </Text>
        </View>
      )}

      <ChatInput onSend={handleSend} onAttach={showAttachmentOptions} onTyping={handleTyping} />

      {/* Modal pour modifier un message */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Modifier le message</Text>
            <TextInput
              value={editMessageText}
              onChangeText={setEditMessageText}
              multiline
              style={[styles.modalInput, { color: theme.textPrimary, borderColor: theme.border }]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={[styles.modalBtn, { borderColor: theme.border }]}
              >
                <Text style={{ color: theme.textSecondary }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEditedMessage}
                style={[styles.modalBtn, { backgroundColor: theme.accent, borderColor: theme.accent }]}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  uploadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
});
