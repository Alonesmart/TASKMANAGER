import React from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme';

interface ChatInputProps {
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, placeholder = "Message...", disabled = false }: ChatInputProps) => {
  const { theme } = useAppTheme();
  const [text, setText] = React.useState('');

  const handleSend = () => {
    if (text.trim().length > 0 && !disabled) {
      onSend(text.trim());
      setText('');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
      <View style={[styles.inputContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          value={text}
          onChangeText={setText}
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
});
