import { StyleSheet } from "react-native";
import { ThemedScreen } from "@/components/themed-primitives";
import { ThemedText } from "@/components/themed-text";

export default function Projects() {
  return (
    <ThemedScreen style={styles.container}>
      <ThemedText>Projects</ThemedText>
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
