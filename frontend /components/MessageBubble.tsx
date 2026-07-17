import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, Linking } from 'react-native';
import { useAppTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

interface MessageBubbleProps {
  message: {
    contenu: string;
    date_envoi: string;
    id_expediteur: number;
    currentUserId: number;
    statut?: string;
    nomExpediteur?: string;
  };
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const { theme } = useAppTheme();
  const isMine = message.id_expediteur === message.currentUserId;

  const date = new Date(message.date_envoi);
  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const content = message.contenu || "";
  const isImage = content.startsWith("📷 [Image] ");
  const isFile = content.startsWith("📄 [Fichier] ");

  let fileName = "";
  let fileUrl = "";

  if (isImage) {
    const parts = content.split("\n");
    fileName = parts[0].replace("📷 [Image] ", "");
    fileUrl = parts[1] || "";
  } else if (isFile) {
    const parts = content.split("\n");
    fileName = parts[0].replace("📄 [Fichier] ", "");
    fileUrl = parts[1] || "";
  }

  const renderTicks = () => {
    if (!isMine) return null;
    let iconName: "checkmark" | "checkmark-done" = "checkmark";
    let iconColor = "rgba(255, 255, 255, 0.5)";

    if (message.statut === "distribue") {
      iconName = "checkmark-done";
      iconColor = "rgba(255, 255, 255, 0.7)";
    } else if (message.statut === "lu") {
      iconName = "checkmark-done";
      iconColor = "#53BDEB";
    }
    return (
      <Ionicons name={iconName} size={15} color={iconColor} style={{ marginLeft: 4 }} />
    );
  };

  if (isImage) {
    return (
      <View style={[styles.container, isMine ? styles.myContainer : styles.theirContainer]}>
        <View style={[
          styles.bubble,
          isMine ? styles.myBubble : styles.theirBubble,
          { backgroundColor: isMine ? theme.accent : theme.cardBg, borderColor: theme.border, padding: 4 }
        ]}>
          {!isMine && message.nomExpediteur && (
            <Text style={[styles.senderName, { color: theme.accent, paddingHorizontal: 8, paddingTop: 4 }]}>
              {message.nomExpediteur}
            </Text>
          )}
          <TouchableOpacity onPress={() => fileUrl && Linking.openURL(fileUrl)} activeOpacity={0.9}>
            <Image 
              source={{ uri: fileUrl }} 
              style={styles.imagePreview} 
              resizeMode="cover"
            />
            <Text style={[styles.text, { color: isMine ? '#fff' : theme.textPrimary, paddingHorizontal: 8, paddingBottom: 4 }]} numberOfLines={1}>
              {fileName}
            </Text>
          </TouchableOpacity>
          <View style={styles.timestampContainer}>
            <Text style={[
              styles.timestamp,
              { color: isMine ? 'rgba(255,255,255,0.7)' : theme.textSecondary }
            ]}>
              {timeString}
            </Text>
            {renderTicks()}
          </View>
        </View>
      </View>
    );
  }

  if (isFile) {
    return (
      <View style={[styles.container, isMine ? styles.myContainer : styles.theirContainer]}>
        <View style={[
          styles.bubble,
          isMine ? styles.myBubble : styles.theirBubble,
          { backgroundColor: isMine ? theme.accent : theme.cardBg, borderColor: theme.border, minWidth: 200 }
        ]}>
          {!isMine && message.nomExpediteur && (
            <Text style={[styles.senderName, { color: theme.accent, paddingHorizontal: 4, paddingTop: 4 }]}>
              {message.nomExpediteur}
            </Text>
          )}
          <TouchableOpacity 
            style={styles.fileRow}
            onPress={() => fileUrl && Linking.openURL(fileUrl)}
            activeOpacity={0.8}
          >
            <View style={[styles.fileIconContainer, { backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : theme.accent + '1c' }]}>
              <Ionicons name="document-text" size={20} color={isMine ? '#fff' : theme.accent} />
            </View>
            <View style={styles.fileDetails}>
              <Text numberOfLines={1} style={[styles.text, { color: isMine ? '#fff' : theme.textPrimary, fontWeight: '600', fontSize: 14 }]}>
                {fileName}
              </Text>
              <Text style={{ fontSize: 11, color: isMine ? 'rgba(255,255,255,0.7)' : theme.textSecondary }}>
                Document joint
              </Text>
            </View>
            <Ionicons name="download-outline" size={18} color={isMine ? '#fff' : theme.textSecondary} />
          </TouchableOpacity>
          <View style={styles.timestampContainer}>
            <Text style={[
              styles.timestamp,
              { color: isMine ? 'rgba(255,255,255,0.7)' : theme.textSecondary }
            ]}>
              {timeString}
            </Text>
            {renderTicks()}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      isMine ? styles.myContainer : styles.theirContainer
    ]}>
      <View style={[
        styles.bubble,
        isMine ? styles.myBubble : styles.theirBubble,
        { backgroundColor: isMine ? theme.accent : theme.cardBg, borderColor: theme.border }
      ]}>
        {!isMine && message.nomExpediteur && (
          <Text style={[styles.senderName, { color: theme.accent, marginBottom: 4 }]}>
            {message.nomExpediteur}
          </Text>
        )}
        <Text style={[
          styles.text,
          { color: isMine ? '#fff' : theme.textPrimary }
        ]}>
          {message.contenu}
        </Text>
        <View style={styles.timestampContainer}>
          <Text style={[
            styles.timestamp,
            { color: isMine ? 'rgba(255,255,255,0.7)' : theme.textSecondary }
          ]}>
            {timeString}
          </Text>
          {renderTicks()}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12,
    width: '100%',
  },
  myContainer: {
    justifyContent: 'flex-end',
  },
  theirContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  myBubble: {
    borderBottomRightRadius: 2,
  },
  theirBubble: {
    borderBottomLeftRadius: 2,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 0,
  },
  imagePreview: {
    width: 220,
    height: 160,
    borderRadius: 14,
    marginBottom: 6,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  fileIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileDetails: {
    flex: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
