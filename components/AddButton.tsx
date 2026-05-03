import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  GestureResponderEvent,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

type AddButtonProps = {
  onPress: (event: GestureResponderEvent) => void;
  backgroundColor: string;
  accessibilityLabel?: string;
  activeOpacity?: number;
  iconColor?: string;
  iconSize?: number;
  shadowColor?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export default function AddButton({
  onPress,
  backgroundColor,
  accessibilityLabel = "Ajouter",
  activeOpacity = 0.8,
  iconColor = "#fff",
  iconSize = 30,
  shadowColor,
  size = 44,
  style,
}: AddButtonProps) {
  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      activeOpacity={activeOpacity}
      onPress={onPress}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          shadowColor: shadowColor ?? backgroundColor,
        },
        style,
      ]}
    >
      <Ionicons name="add" size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    bottom: 20,
    right: 20,
    alignItems: "center",
    elevation: 6,
    justifyContent: "center",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
