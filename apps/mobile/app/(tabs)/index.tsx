import { useCallback, useMemo } from "react";
import { View, FlatList, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";

import { useAppStore } from "../../src/stores/appStore";
import { useConnectionStore } from "../../src/api/connection";
import { ThreadListItem } from "../../src/components/ThreadListItem";
import { ThemedText } from "../../src/components/ThemedText";
import { rpc } from "../../src/api/rpcClient";
import { useState } from "react";

export default function ThreadsScreen() {
  const threads = useAppStore((s) => s.threads);
  const projects = useAppStore((s) => s.projects);
  const bootstrapComplete = useAppStore((s) => s.bootstrapComplete);
  const syncSnapshot = useAppStore((s) => s.syncSnapshot);
  const connectionStatus = useConnectionStore((s) => s.status);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const projectMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projects) {
      map[p.id] = p.name;
    }
    return map;
  }, [projects]);

  const activeThreads = useMemo(
    () =>
      threads
        .filter((t) => !t.archivedAt)
        .sort((a, b) => {
          const aTime = a.updatedAt ?? a.createdAt;
          const bTime = b.updatedAt ?? b.createdAt;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        }),
    [threads],
  );

  const onRefresh = useCallback(async () => {
    if (connectionStatus !== "connected") return;
    setRefreshing(true);
    try {
      const snapshot = await rpc.orchestration.getSnapshot();
      syncSnapshot(snapshot);
    } catch {
      // Silently handle refresh errors
    } finally {
      setRefreshing(false);
    }
  }, [connectionStatus, syncSnapshot]);

  if (connectionStatus !== "connected") {
    return (
      <View style={styles.center}>
        <ThemedText variant="subtitle" style={styles.emptyTitle}>
          Not Connected
        </ThemedText>
        <ThemedText variant="caption" style={styles.emptyHint}>
          Go to Settings to connect to your T3 desktop app
        </ThemedText>
      </View>
    );
  }

  if (!bootstrapComplete) {
    return (
      <View style={styles.center}>
        <ThemedText variant="caption">Loading threads...</ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      data={activeThreads}
      keyExtractor={(item) => item.id}
      style={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a78bfa" />
      }
      renderItem={({ item }) => (
        <ThreadListItem
          thread={item}
          projectName={projectMap[item.projectId] ?? "Unknown"}
          onPress={() => router.push(`/thread/${item.id}`)}
        />
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <ThemedText variant="subtitle" style={styles.emptyTitle}>
            No Threads Yet
          </ThemedText>
          <ThemedText variant="caption" style={styles.emptyHint}>
            Start a conversation from the desktop app
          </ThemedText>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#09090b",
    padding: 32,
  },
  emptyTitle: {
    marginBottom: 8,
  },
  emptyHint: {
    textAlign: "center",
  },
});
