import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAppStore, type ChatMessage } from "../../src/stores/appStore";
import { useConnectionStore } from "../../src/api/connection";
import { rpc } from "../../src/api/rpcClient";
import { MessageBubble } from "../../src/components/MessageBubble";
import { ThemedText } from "../../src/components/ThemedText";
import { StatusBadge } from "../../src/components/StatusBadge";

function generateCommandId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const thread = useAppStore((s) => s.threads.find((t) => t.id === id));
  const projects = useAppStore((s) => s.projects);
  const connectionStatus = useConnectionStore((s) => s.status);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const project = projects.find((p) => p.id === thread?.projectId);
  const sessionStatus = thread?.session?.status;
  const isRunning = sessionStatus === "running";

  useEffect(() => {
    if (thread?.messages.length) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [thread?.messages.length]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !thread || sending) return;
    if (connectionStatus !== "connected") return;

    const text = input.trim();
    setInput("");
    setSending(true);

    try {
      await rpc.orchestration.dispatchCommand({
        type: "thread.turn.start",
        commandId: generateCommandId(),
        threadId: thread.id,
        text,
        attachments: [],
      } as any);
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [input, thread, sending, connectionStatus]);

  const handleInterrupt = useCallback(async () => {
    if (!thread) return;
    try {
      await rpc.orchestration.dispatchCommand({
        type: "thread.turn.interrupt",
        commandId: generateCommandId(),
        threadId: thread.id,
      } as any);
    } catch {
      // Silently handle interrupt errors
    }
  }, [thread]);

  if (!thread) {
    return (
      <View style={styles.center}>
        <ThemedText variant="caption">Thread not found</ThemedText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: thread.title,
          headerRight: () => (sessionStatus ? <StatusBadge status={sessionStatus} /> : null),
        }}
      />

      {/* Thread Info Bar */}
      <View style={styles.infoBar}>
        <ThemedText variant="caption" style={styles.projectName}>
          {project?.name ?? "Unknown"}
        </ThemedText>
        {thread.branch && <ThemedText variant="caption">· {thread.branch}</ThemedText>}
        <ThemedText variant="caption" style={styles.modelName}>
          · {thread.modelSelection.model}
        </ThemedText>
        <View style={styles.infoSpacer} />
        <ThemedText
          variant="caption"
          style={[styles.runtimeMode, thread.runtimeMode === "full-access" && styles.runtimeFull]}
        >
          {thread.runtimeMode === "full-access" ? "Full access" : "Approval"}
        </ThemedText>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={thread.messages}
        keyExtractor={(item) => item.id}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        renderItem={({ item }) => <MessageBubble message={item} />}
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <ThemedText variant="caption">No messages yet. Send a prompt to begin.</ThemedText>
          </View>
        }
        onContentSizeChange={() => {
          listRef.current?.scrollToEnd({ animated: false });
        }}
      />

      {/* Input Bar */}
      <View style={styles.inputBar}>
        {isRunning ? (
          <Pressable style={styles.interruptButton} onPress={handleInterrupt}>
            <Ionicons name="stop-circle" size={20} color="#ef4444" />
            <ThemedText style={styles.interruptText}>Interrupt</ThemedText>
          </Pressable>
        ) : null}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder={isRunning ? "Agent is working..." : "Send a message..."}
            placeholderTextColor="#52525b"
            multiline
            maxLength={120_000}
            editable={!isRunning && !sending}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <Pressable
            style={[
              styles.sendButton,
              (!input.trim() || isRunning || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!input.trim() || isRunning || sending}
          >
            <Ionicons
              name="arrow-up-circle"
              size={32}
              color={input.trim() && !isRunning && !sending ? "#a78bfa" : "#3f3f46"}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#27272a",
    gap: 4,
  },
  projectName: {
    color: "#a78bfa",
    fontWeight: "600",
  },
  modelName: {
    fontFamily: "monospace",
  },
  infoSpacer: {
    flex: 1,
  },
  runtimeMode: {
    fontSize: 11,
    fontWeight: "600",
    color: "#f59e0b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#27272a",
    overflow: "hidden",
  },
  runtimeFull: {
    color: "#22c55e",
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    padding: 12,
    paddingBottom: 8,
  },
  emptyMessages: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  inputBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#27272a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 8,
    backgroundColor: "#09090b",
  },
  interruptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    marginBottom: 4,
  },
  interruptText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#18181b",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#fafafa",
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  sendButton: {
    paddingBottom: 2,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
