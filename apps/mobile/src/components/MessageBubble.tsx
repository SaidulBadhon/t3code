import { View, StyleSheet } from "react-native";

import { type ChatMessage } from "../stores/appStore";
import { ThemedText } from "./ThemedText";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <View
      style={[
        styles.bubble,
        isUser && styles.userBubble,
        !isUser && !isSystem && styles.assistantBubble,
        isSystem && styles.systemBubble,
      ]}
    >
      {!isUser && (
        <ThemedText variant="label" style={styles.roleLabel}>
          {message.role}
        </ThemedText>
      )}
      <ThemedText style={[styles.text, isUser && styles.userText]}>
        {message.text}
        {message.streaming && "▊"}
      </ThemedText>
      <ThemedText variant="caption" style={styles.timestamp}>
        {new Date(message.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "85%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginVertical: 3,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#6d28d9",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#27272a",
    borderBottomLeftRadius: 4,
  },
  systemBubble: {
    alignSelf: "center",
    backgroundColor: "#1c1917",
    borderRadius: 8,
    paddingVertical: 6,
  },
  roleLabel: {
    marginBottom: 4,
    color: "#a78bfa",
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: "#fafafa",
  },
  userText: {
    color: "#ffffff",
  },
  timestamp: {
    marginTop: 4,
    fontSize: 11,
    alignSelf: "flex-end",
    color: "#71717a",
  },
});
