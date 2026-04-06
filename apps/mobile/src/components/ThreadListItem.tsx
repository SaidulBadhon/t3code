import { View, StyleSheet, Pressable } from "react-native";

import { type Thread } from "../stores/appStore";
import { ThemedText } from "./ThemedText";
import { StatusBadge } from "./StatusBadge";

interface ThreadListItemProps {
  thread: Thread;
  projectName: string;
  onPress: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ThreadListItem({ thread, projectName, onPress }: ThreadListItemProps) {
  const lastMessage = thread.messages[thread.messages.length - 1];
  const sessionStatus = thread.session?.status;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <ThemedText variant="subtitle" numberOfLines={1} style={styles.title}>
          {thread.title}
        </ThemedText>
        <ThemedText variant="caption">
          {formatRelativeTime(thread.updatedAt ?? thread.createdAt)}
        </ThemedText>
      </View>
      <View style={styles.meta}>
        <ThemedText variant="caption" numberOfLines={1} style={styles.project}>
          {projectName}
        </ThemedText>
        {thread.branch && (
          <ThemedText variant="caption" numberOfLines={1}>
            · {thread.branch}
          </ThemedText>
        )}
      </View>
      {lastMessage && (
        <ThemedText variant="caption" numberOfLines={2} style={styles.preview}>
          {lastMessage.role === "user" ? "You: " : ""}
          {lastMessage.text.slice(0, 120)}
        </ThemedText>
      )}
      <View style={styles.footer}>
        <ThemedText style={styles.model}>{thread.modelSelection.model}</ThemedText>
        {sessionStatus && <StatusBadge status={sessionStatus} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#27272a",
    backgroundColor: "#09090b",
  },
  pressed: {
    backgroundColor: "#18181b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    flex: 1,
    marginRight: 8,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  project: {
    color: "#a78bfa",
  },
  preview: {
    marginBottom: 8,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  model: {
    fontSize: 12,
    color: "#71717a",
    fontFamily: "monospace",
  },
});
