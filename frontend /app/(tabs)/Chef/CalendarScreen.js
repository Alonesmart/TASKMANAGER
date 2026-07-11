import { StyleSheet } from "react-native";
import { ThemedScreen } from "@/components/themed-primitives";
import { ThemedText } from "@/components/themed-text";

export default function CalendarScreen() {
  return (
    <ThemedScreen style={styles.container}>
      <ThemedText>CalendarScreen</ThemedText>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
