import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useAppTheme } from '@/theme';
import { DateTime } from 'luxon'; // Assuming luxon is available for easy date formatting, otherwise I'll use native Date

interface MessageBubbleProps {
  message: {
    contenu: string;
    date_envoi: string;
    id_expediteur: number;
    currentUserId: number;
  };
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const { theme } = useAppTheme();
  const isMine = message.id_expediteur === message.currentUserId;

  const date = new Date(message.date_envoi);
  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
        <Text style={[
          styles.text,
          { color: isMine ? '#fff' : theme.textPrimary }
        ]}>
          {message.contenu}
        </Text>
        <Text style={[
          styles.timestamp,
          { color: isMine ? 'rgba(255,255,255,0.7)' : theme.textSecondary }
        ]}>
          {timeString}
        </Text>
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
  timestamp: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
});
