import { StyleSheet } from "react-native";
import { ThemedScreen } from "@/components/themed-primitives";
import { ThemedText } from "@/components/themed-text";

export default function Services() {
  return (
    <ThemedScreen style={styles.container}>
      <ThemedText>Services</ThemedText>
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
