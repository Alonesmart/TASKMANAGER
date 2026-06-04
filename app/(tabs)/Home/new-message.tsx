import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppTheme, useAppTheme } from "@/theme";

const createMessageColors = (theme: AppTheme) => ({
  bg: theme.bg,
  card: theme.cardBg,
  accent: theme.accent,
  accentSoft: theme.accentSoft,
  textPrimary: theme.textPrimary,
  textSecondary: theme.textSecondary,
  border: theme.border,
  success: theme.success,
  warning: theme.warning,
});

type MessageColors = ReturnType<typeof createMessageColors>;

// ─── Mock contacts ─────────────────────────────────────────────────────────────
const CONTACTS = [
  { id: "1", name: "Alice Martin", role: "Designer", initials: "AM", color: "#f78166" },
  { id: "2", name: "Jean Dupont", role: "Développeur", initials: "JD", color: "#54aeff" },
  { id: "3", name: "Sara Nkomo", role: "Chef de projet", initials: "SN", color: "#3fb950" },
  { id: "4", name: "Marc Leblanc", role: "Analyste", initials: "ML", color: "#d2a8ff" },
  { id: "5", name: "Fatou Diallo", role: "RH", initials: "FD", color: "#ffa657" },
  { id: "6", name: "Forba Raoul", role: "Directeur", initials: "PE", color: "#ff7b72" },
  { id: "7", name: "Tenmou Christian", role: "RH", initials: "FD", color: "#ffa657" },

];

type Contact = (typeof CONTACTS)[0];
type Attachment = {
  id: string;
  kind: "image" | "file" | "link";
  uri: string;
  name: string;
  mimeType?: string;
  fileSize?: number;
};

const getPriorityBtnActiveStyle = (p: "normal" | "urgent", colors: MessageColors): ViewStyle => ({
  backgroundColor: p === "urgent" ? colors.warning + "22" : colors.accentSoft,
  borderColor: p === "urgent" ? colors.warning : colors.accent,
});

// ─── Avatar ────────────────────────────────────────────────────────────────────
function ContactAvatar({
  contact,
  size = 40,
  styles,
}: {
  contact: Contact;
  size?: number;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View
      style={[
        styles.contactAvatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: contact.color + "33" },
      ]}
    >
      <Text style={[styles.contactAvatarText, { color: contact.color, fontSize: size * 0.35 }]}>
        {contact.initials}
      </Text>
    </View>
  );
}

// ─── Recipient chip ────────────────────────────────────────────────────────────
function RecipientChip({
  contact,
  onRemove,
  styles,
  colors,
}: {
  contact: Contact;
  onRemove: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: MessageColors;
}) {
  return (
    <View style={styles.chip}>
      <View style={[styles.chipDot, { backgroundColor: contact.color }]} />
      <Text style={styles.chipText}>{contact.name.split(" ")[0]}</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
        <Ionicons name="close" size={13} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Contact row ───────────────────────────────────────────────────────────────
function ContactRow({
  contact,
  selected,
  onToggle,
  styles,
}: {
  contact: Contact;
  selected: boolean;
  onToggle: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <TouchableOpacity style={styles.contactRow} onPress={onToggle} activeOpacity={0.7}>
      <ContactAvatar contact={contact} styles={styles} />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{contact.name}</Text>
        <Text style={styles.contactRole}>{contact.role}</Text>
      </View>
      <View style={[styles.checkbox, selected && styles.checkboxActive]}>
        {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function NewMessageScreen() {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();
  const colors = useMemo(() => createMessageColors(theme), [theme]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState<Contact[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [step, setStep] = useState<"recipients" | "compose">("recipients");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const slideAnim = useRef(new Animated.Value(0)).current;

  const filtered = CONTACTS.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.role.toLowerCase().includes(search.toLowerCase())
  );

  const toggleRecipient = (contact: Contact) => {
    setRecipients((prev) =>
      prev.find((r) => r.id === contact.id)
        ? prev.filter((r) => r.id !== contact.id)
        : [...prev, contact]
    );
  };

  const goToCompose = () => {
    if (recipients.length === 0) return;
    setStep("compose");
    Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }).start();
  };

  const goBack = () => {
    if (step === "compose") {
      setStep("recipients");
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    } else {
      router.back();
    }
  };

  const handleSend = () => {
    // Connect to your send logic here
    router.back();
  };

  const pickPhotoFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission requise", "Autorisez l'accès à la galerie pour ajouter une photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });

    if (result.canceled) return;

    const newAttachments: Attachment[] = result.assets.map((asset, index) => ({
      id: `${Date.now()}-${index}-${asset.assetId ?? "img"}`,
      kind: "image",
      uri: asset.uri,
      name: asset.fileName ?? `photo-${Date.now()}-${index + 1}.jpg`,
      mimeType: asset.mimeType,
      fileSize: asset.fileSize,
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const pickFileFromDevice = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: "*/*",
    });

    if (result.canceled) return;

    const newAttachments: Attachment[] = result.assets.map((asset, index) => ({
      id: `${Date.now()}-${index}-${asset.name}`,
      kind: "file",
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType,
      fileSize: asset.size,
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const addLinkAttachment = () => {
    const raw = linkInput.trim();
    if (!raw) return;

    const normalized = raw.match(/^https?:\/\//i) ? raw : `https://${raw}`;

    try {
      const parsed = new URL(normalized);
      setAttachments((prev) => [
        ...prev,
        {
          id: `${Date.now()}-link`,
          kind: "link",
          uri: parsed.toString(),
          name: parsed.hostname,
          mimeType: "text/uri-list",
        },
      ]);
      setLinkInput("");
      setShowLinkInput(false);
    } catch {
      Alert.alert("Lien invalide", "Entrez une URL valide, par exemple https://exemple.com");
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((file) => file.id !== id));
  };

  const canSend = recipients.length > 0 && subject.trim().length > 0 && body.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={goBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Nouveau message</Text>
          <Text style={styles.headerSub}>
            {step === "recipients"
              ? `${recipients.length} destinataire${recipients.length !== 1 ? "s" : ""} sélectionné${recipients.length !== 1 ? "s" : ""}`
              : recipients.map((r) => r.name.split(" ")[0]).join(", ")}
          </Text>
        </View>
        {step === "recipients" ? (
          <TouchableOpacity
            style={[styles.nextBtn, recipients.length === 0 && styles.nextBtnDisabled]}
            onPress={goToCompose}
            activeOpacity={0.8}
          >
            <Text style={styles.nextBtnText}>Suivant</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={handleSend}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={14} color="#fff" />
            <Text style={styles.sendBtnText}>Envoyer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── STEP 1 : Destinataires ── */}
      {step === "recipients" && (
        <View style={{ flex: 1 }}>
          {/* Search bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un contact..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Selected chips */}
          {recipients.length > 0 && (
            <ScrollView
              horizontal
              style={styles.chipsRow}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 4 }}
            >
              {recipients.map((r) => (
                <RecipientChip key={r.id} contact={r} onRemove={() => toggleRecipient(r)} styles={styles} colors={colors} />
              ))}
            </ScrollView>
          )}

          {/* Contacts list */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 }}
            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            ListHeaderComponent={
              <Text style={styles.listHeader}>
                {search ? `Résultats pour "${search}"` : "Tous les contacts"}
              </Text>
            }
            renderItem={({ item }) => (
              <ContactRow
                contact={item}
                selected={!!recipients.find((r) => r.id === item.id)}
                onToggle={() => toggleRecipient(item)}
                styles={styles}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="person-outline" size={32} color={colors.textSecondary} />
                <Text style={styles.emptyText}>Aucun contact trouvé</Text>
              </View>
            }
          />
        </View>
      )}

      {/* ── STEP 2 : Rédaction ── */}
      {step === "compose" && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.composeContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Recipients preview */}
            <View style={styles.toRow}>
              <Text style={styles.toLabel}>À :</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {recipients.map((r) => (
                    <View key={r.id} style={styles.toChip}>
                      <View style={[styles.toChipDot, { backgroundColor: r.color }]} />
                      <Text style={styles.toChipText}>{r.name}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.divider} />

            {/* Priority */}
            <View style={styles.priorityRow}>
              <Text style={styles.fieldLabel}>Priorité</Text>
              <View style={styles.priorityToggle}>
                {(["normal", "urgent"] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.priorityBtn, priority === p && getPriorityBtnActiveStyle(p, colors)]}
                    onPress={() => setPriority(p)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={p === "urgent" ? "warning-outline" : "checkmark-circle-outline"}
                      size={13}
                      color={
                        priority === p ? (p === "urgent" ? colors.warning : colors.accent) : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.priorityBtnText,
                        priority === p && { color: p === "urgent" ? colors.warning : colors.accent },
                      ]}
                    >
                      {p === "normal" ? "Normal" : "Urgent"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Subject */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Objet</Text>
              <TextInput
                style={styles.subjectInput}
                placeholder="Titre du message..."
                placeholderTextColor={colors.textSecondary}
                value={subject}
                onChangeText={setSubject}
                maxLength={80}
              />
            </View>

            <View style={styles.divider} />

            {/* Body */}
            <View style={styles.bodyContainer}>
              <TextInput
                style={styles.bodyInput}
                placeholder="Rédigez votre message ici..."
                placeholderTextColor={colors.textSecondary}
                value={body}
                onChangeText={setBody}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{body.length} caractères</Text>
            </View>

            {/* Attachments bar */}
            <View style={styles.attachBar}>
              <Text style={styles.attachLabel}>Pièces jointes</Text>
              <View style={styles.attachActions}>
                {[
                  { icon: "image-outline", label: "Photo", onPress: pickPhotoFromGallery },
                  { icon: "document-outline", label: "Fichier", onPress: pickFileFromDevice },
                  { icon: "link-outline", label: "Lien", onPress: () => setShowLinkInput((prev) => !prev) },
                ].map((a) => (
                  <TouchableOpacity key={a.label} style={styles.attachBtn} activeOpacity={0.7} onPress={a.onPress}>
                    <Ionicons name={a.icon as any} size={16} color={colors.accent} />
                    <Text style={styles.attachBtnText}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {showLinkInput && (
                <View style={styles.linkInputWrap}>
                  <TextInput
                    style={styles.linkInput}
                    placeholder="https://exemple.com"
                    placeholderTextColor={colors.textSecondary}
                    value={linkInput}
                    onChangeText={setLinkInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                  <View style={styles.linkActions}>
                    <TouchableOpacity
                      style={[styles.linkActionBtn, styles.linkCancelBtn]}
                      activeOpacity={0.8}
                      onPress={() => {
                        setShowLinkInput(false);
                        setLinkInput("");
                      }}
                    >
                      <Text style={styles.linkCancelText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.linkActionBtn, styles.linkAddBtn]}
                      activeOpacity={0.8}
                      onPress={addLinkAttachment}
                    >
                      <Text style={styles.linkAddText}>Ajouter</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {attachments.length > 0 && (
                <View style={styles.attachmentsList}>
                  {attachments.map((file) => (
                    <View key={file.id} style={styles.attachmentItem}>
                      <View style={styles.attachmentMeta}>
                        {file.kind === "image" ? (
                          <Image
                            source={{ uri: file.uri }}
                            style={styles.attachmentThumb}
                            contentFit="cover"
                            transition={120}
                          />
                        ) : (
                          <View style={styles.attachmentIconWrap}>
                            <Ionicons
                              name={file.kind === "file" ? "document-outline" : "link-outline"}
                              size={14}
                              color={colors.accent}
                            />
                          </View>
                        )}
                        <Text numberOfLines={1} style={styles.attachmentName}>
                          {file.kind === "link" ? file.uri : file.name}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => removeAttachment(file.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const createStyles = (colors: MessageColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1 },
  headerTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "700" },
  headerSub: { color: colors.textSecondary, fontSize: 12, marginTop: 1 },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  nextBtnDisabled: { backgroundColor: colors.border },
  nextBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.success,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  sendBtnDisabled: { backgroundColor: colors.border },
  sendBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 14 },

  // Chips
  chipsRow: { maxHeight: 44, marginTop: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.accent + "44",
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { color: colors.accent, fontSize: 12, fontWeight: "600" },

  // List
  listHeader: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    marginBottom: 10,
    marginTop: 4,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  contactAvatar: { alignItems: "center", justifyContent: "center" },
  contactAvatarText: { fontWeight: "700" },
  contactInfo: { flex: 1 },
  contactName: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  contactRole: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { backgroundColor: colors.accent, borderColor: colors.accent },

  // Empty
  emptyState: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },

  // Compose
  composeContent: { paddingBottom: 40 },
  toRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  toLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: "600", width: 28 },
  toChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toChipDot: { width: 7, height: 7, borderRadius: 3.5 },
  toChipText: { color: colors.textPrimary, fontSize: 12, fontWeight: "500" },

  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },

  priorityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  fieldLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: "600", width: 50 },
  priorityToggle: { flexDirection: "row", gap: 8 },
  priorityBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 5,
  },
  priorityBtnText: { color: colors.textSecondary, fontSize: 12, fontWeight: "500" },

  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  subjectInput: { flex: 1, color: colors.textPrimary, fontSize: 15, fontWeight: "500" },

  bodyContainer: { paddingHorizontal: 16, paddingTop: 16 },
  bodyInput: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    minHeight: 200,
  },
  charCount: { color: colors.textSecondary, fontSize: 11, textAlign: "right", marginTop: 8 },

  attachBar: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  attachLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
  },
  attachActions: { flexDirection: "row", gap: 10 },
  attachBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.accent + "33",
  },
  attachBtnText: { color: colors.accent, fontSize: 12, fontWeight: "600" },
  linkInputWrap: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: colors.bg,
    gap: 10,
  },
  linkInput: {
    color: colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  linkActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  linkActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  linkCancelBtn: {
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  linkAddBtn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  linkCancelText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  linkAddText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },

  attachmentsList: {
    marginTop: 12,
    gap: 8,
  },
  attachmentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  attachmentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  attachmentThumb: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  attachmentIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentName: {
    color: colors.textPrimary,
    fontSize: 12,
    flex: 1,
  },
});
