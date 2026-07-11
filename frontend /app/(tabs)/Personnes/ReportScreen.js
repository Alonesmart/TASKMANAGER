import { StyleSheet } from "react-native";
import { ThemedScreen } from "@/components/themed-primitives";
import { ThemedText } from "@/components/themed-text";

export default function PersonnesReportScreen() {
  return (
    <ThemedScreen style={styles.container}>
      <ThemedText>ReportScreen</ThemedText>
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
