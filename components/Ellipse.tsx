import { LinearGradient, type LinearGradientPoint, type LinearGradientProps } from "expo-linear-gradient";
import React from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";

type EllipseProps = {
  colors?: LinearGradientProps["colors"];
  end?: LinearGradientPoint;
  start?: LinearGradientPoint;
  style?: StyleProp<ViewStyle>;
};

export default function Ellipse({
  colors = ["#5BA3F5", "#0D2347"],
  end = { x: 1, y: 1 },
  start = { x: 0, y: 0 },
  style,
}: EllipseProps) {
  return <LinearGradient colors={colors} end={end} start={start} style={[styles.ellipse, style]} />;
}

const styles = StyleSheet.create({
  ellipse: {
    position: "absolute",
    width: 550,
    height: 550,
    borderRadius: 275,
    top: -300,
    left: -250,
    overflow: "hidden",
  },
});
