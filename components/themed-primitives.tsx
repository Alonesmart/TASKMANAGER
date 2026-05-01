import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewProps,
} from "react-native";
import { useAppTheme } from "@/theme";

export function ThemedScreen({ style, ...props }: ViewProps) {
  const { theme } = useAppTheme();
  return <View style={[styles.screen, { backgroundColor: theme.bg }, style]} {...props} />;
}

export function ThemedCard({ style, ...props }: ViewProps) {
  const { theme } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.cardBg, borderColor: theme.border },
        style,
      ]}
      {...props}
    />
  );
}

export function ThemedLabel({ style, ...props }: TextProps) {
  const { theme } = useAppTheme();
  return <Text style={[styles.label, { color: theme.textSecondary }, style]} {...props} />;
}

export function ThemedInput({ style, placeholderTextColor, ...props }: TextInputProps) {
  const { theme } = useAppTheme();
  return (
    <TextInput
      placeholderTextColor={placeholderTextColor ?? theme.textMuted}
      style={[
        styles.input,
        {
          backgroundColor: theme.bg,
          borderColor: theme.border,
          color: theme.textPrimary,
        },
        style,
      ]}
      {...props}
    />
  );
}

type ThemedButtonProps = TouchableOpacityProps & {
  title?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "primary" | "secondary" | "danger";
};

export function ThemedButton({
  title,
  icon,
  variant = "primary",
  style,
  children,
  ...props
}: ThemedButtonProps) {
  const { theme } = useAppTheme();
  const backgroundColor =
    variant === "danger"
      ? theme.logoutColor
      : variant === "secondary"
        ? theme.cardBg
        : theme.accent;
  const foregroundColor = variant === "secondary" ? theme.textPrimary : "#fff";

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor: variant === "secondary" ? theme.border : backgroundColor,
        },
        style,
      ]}
      {...props}
    >
      {icon ? <Ionicons name={icon} size={17} color={foregroundColor} /> : null}
      {title ? <Text style={[styles.buttonText, { color: foregroundColor }]}>{title}</Text> : children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  button: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
