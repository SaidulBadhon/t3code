import { useMemo } from "react";
import { View, FlatList, StyleSheet, Pressable } from "react-native";

import { useAppStore, type Project } from "../../src/stores/appStore";
import { useConnectionStore } from "../../src/api/connection";
import { ThemedText } from "../../src/components/ThemedText";

function ProjectCard({ project, threadCount }: { project: Project; threadCount: number }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <ThemedText style={styles.icon}>📁</ThemedText>
        </View>
        <View style={styles.cardInfo}>
          <ThemedText variant="subtitle" numberOfLines={1}>
            {project.name}
          </ThemedText>
          <ThemedText variant="caption" numberOfLines={1}>
            {project.cwd}
          </ThemedText>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <ThemedText variant="caption">
          {threadCount} {threadCount === 1 ? "thread" : "threads"}
        </ThemedText>
        {project.defaultModelSelection && (
          <ThemedText style={styles.model}>{project.defaultModelSelection.model}</ThemedText>
        )}
      </View>
    </Pressable>
  );
}

export default function ProjectsScreen() {
  const projects = useAppStore((s) => s.projects);
  const threads = useAppStore((s) => s.threads);
  const connectionStatus = useConnectionStore((s) => s.status);

  const threadCountsByProject = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of threads) {
      if (!t.archivedAt) {
        counts[t.projectId] = (counts[t.projectId] ?? 0) + 1;
      }
    }
    return counts;
  }, [threads]);

  if (connectionStatus !== "connected") {
    return (
      <View style={styles.center}>
        <ThemedText variant="subtitle" style={styles.emptyTitle}>
          Not Connected
        </ThemedText>
        <ThemedText variant="caption">Connect to your T3 desktop app in Settings</ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      data={projects}
      keyExtractor={(item) => item.id}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <ProjectCard project={item} threadCount={threadCountsByProject[item.id] ?? 0} />
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <ThemedText variant="subtitle" style={styles.emptyTitle}>
            No Projects
          </ThemedText>
          <ThemedText variant="caption">Add a project from the desktop app</ThemedText>
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
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "#18181b",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  cardPressed: {
    backgroundColor: "#27272a",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#27272a",
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {
    fontSize: 20,
  },
  cardInfo: {
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  model: {
    fontSize: 12,
    color: "#71717a",
    fontFamily: "monospace",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    marginBottom: 8,
  },
});
