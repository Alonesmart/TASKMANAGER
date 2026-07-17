import React from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme';

interface ChatInputProps {
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onAttach?: () => void;
  onTyping?: (isTyping: boolean) => void;
}

export const ChatInput = ({ onSend, placeholder = "Message...", disabled = false, onAttach, onTyping }: ChatInputProps) => {
  const { theme } = useAppTheme();
  const [text, setText] = React.useState('');
  const typingTimeoutRef = React.useRef<any>(null);

  const handleSend = () => {
    if (text.trim().length > 0 && !disabled) {
      if (onTyping) {
        onTyping(false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
      onSend(text.trim());
      setText('');
    }
  };

  const handleTextChange = (val: string) => {
    setText(val);
    if (onTyping) {
      onTyping(val.trim().length > 0);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 3000);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
      <View style={[styles.inputContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        {onAttach && (
          <TouchableOpacity 
            onPress={onAttach} 
            disabled={disabled}
            style={styles.attachButton}
          >
            <Ionicons name="attach" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          value={text}
          onChangeText={handleTextChange}
          multiline
          maxLength={1000}
          editable={!disabled}
        />
        <TouchableOpacity 
          onPress={handleSend} 
          disabled={disabled || text.trim().length === 0}
          style={[
            styles.sendButton, 
            { opacity: (disabled || text.trim().length === 0) ? 0.5 : 1 }
          ]}
        >
          <Ionicons name="send" size={24} color={theme.accent} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    maxHeight: 100,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 40,
  },
  sendButton: {
    padding: 6,
    marginLeft: 4,
  },
  attachButton: {
    padding: 6,
    marginRight: 4,
    alignSelf: 'center',
  },
});
