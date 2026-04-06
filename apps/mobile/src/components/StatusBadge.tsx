import { View, StyleSheet } from "react-native";

import { ThemedText } from "./ThemedText";

const STATUS_COLORS: Record<string, string> = {
  running: "#22c55e",
  ready: "#3b82f6",
  connecting: "#f59e0b",
  waiting_for_approval: "#f59e0b",
  waiting_for_user_input: "#f59e0b",
  error: "#ef4444",
  closed: "#71717a",
  idle: "#71717a",
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] ?? "#71717a";
  const label = status.replace(/_/g, " ");

  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText style={[styles.text, { color }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});
