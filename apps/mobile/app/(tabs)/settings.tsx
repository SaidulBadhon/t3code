import { useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, TextInput, Pressable, Switch, Alert } from "react-native";

import { useConnectionStore } from "../../src/api/connection";
import { connectToServer, disconnectFromServer } from "../../src/api/rpcClient";
import { useServerConfigStore } from "../../src/stores/serverConfigStore";
import { useAppStore } from "../../src/stores/appStore";
import { ThemedText } from "../../src/components/ThemedText";
import { StatusBadge } from "../../src/components/StatusBadge";

function SectionHeader({ title }: { title: string }) {
  return (
    <ThemedText variant="label" style={styles.sectionHeader}>
      {title}
    </ThemedText>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.settingRow}>
      <ThemedText variant="body">{label}</ThemedText>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const connectionConfig = useConnectionStore((s) => s.config);
  const connectionStatus = useConnectionStore((s) => s.status);
  const errorMessage = useConnectionStore((s) => s.errorMessage);
  const setConfig = useConnectionStore((s) => s.setConfig);
  const providers = useServerConfigStore((s) => s.providers);
  const settings = useServerConfigStore((s) => s.settings);
  const resetStore = useAppStore((s) => s.reset);

  const [host, setHost] = useState(connectionConfig.host);
  const [port, setPort] = useState(String(connectionConfig.port));
  const [authToken, setAuthToken] = useState(connectionConfig.authToken ?? "");
  const [useTls, setUseTls] = useState(connectionConfig.useTls);

  const handleConnect = useCallback(() => {
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      Alert.alert("Invalid Port", "Port must be between 1 and 65535");
      return;
    }
    const config = {
      host,
      port: portNum,
      authToken: authToken.trim() || null,
      useTls,
    };
    setConfig(config);
    connectToServer(config);
  }, [host, port, authToken, useTls, setConfig]);

  const handleDisconnect = useCallback(() => {
    disconnectFromServer();
    resetStore();
  }, [resetStore]);

  const isConnected = connectionStatus === "connected";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Connection Section */}
      <SectionHeader title="Connection" />
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <ThemedText variant="body">Status</ThemedText>
          <StatusBadge status={connectionStatus} />
        </View>
        {errorMessage && (
          <ThemedText variant="caption" style={styles.error}>
            {errorMessage}
          </ThemedText>
        )}

        <View style={styles.inputGroup}>
          <ThemedText variant="caption" style={styles.inputLabel}>
            Server Host
          </ThemedText>
          <TextInput
            style={styles.input}
            value={host}
            onChangeText={setHost}
            placeholder="192.168.1.100"
            placeholderTextColor="#52525b"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isConnected}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText variant="caption" style={styles.inputLabel}>
            Port
          </ThemedText>
          <TextInput
            style={styles.input}
            value={port}
            onChangeText={setPort}
            placeholder="3773"
            placeholderTextColor="#52525b"
            keyboardType="number-pad"
            editable={!isConnected}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText variant="caption" style={styles.inputLabel}>
            Auth Token (optional)
          </ThemedText>
          <TextInput
            style={styles.input}
            value={authToken}
            onChangeText={setAuthToken}
            placeholder="Leave empty if not set"
            placeholderTextColor="#52525b"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            editable={!isConnected}
          />
        </View>

        <SettingRow label="Use TLS">
          <Switch
            value={useTls}
            onValueChange={setUseTls}
            trackColor={{ true: "#6d28d9", false: "#3f3f46" }}
            thumbColor="#fafafa"
            disabled={isConnected}
          />
        </SettingRow>

        <Pressable
          style={[styles.button, isConnected && styles.buttonDanger]}
          onPress={isConnected ? handleDisconnect : handleConnect}
        >
          <ThemedText style={styles.buttonText}>
            {isConnected
              ? "Disconnect"
              : connectionStatus === "connecting"
                ? "Connecting..."
                : "Connect"}
          </ThemedText>
        </Pressable>
      </View>

      {/* Server Info */}
      {isConnected && (
        <>
          <SectionHeader title="Providers" />
          <View style={styles.card}>
            {providers.length === 0 && (
              <ThemedText variant="caption">No providers configured</ThemedText>
            )}
            {providers.map((provider) => (
              <View key={provider.provider} style={styles.providerRow}>
                <View>
                  <ThemedText variant="body">
                    {provider.provider === "codex" ? "Codex" : "Claude"}
                  </ThemedText>
                  <ThemedText variant="caption">
                    {provider.models.length} models available
                  </ThemedText>
                </View>
                <StatusBadge status={provider.auth.status} />
              </View>
            ))}
          </View>

          <SectionHeader title="Server Settings" />
          <View style={styles.card}>
            {settings && (
              <>
                <SettingRow label="Assistant Streaming">
                  <ThemedText variant="caption">
                    {settings.enableAssistantStreaming ? "Enabled" : "Disabled"}
                  </ThemedText>
                </SettingRow>
                <SettingRow label="Thread Mode">
                  <ThemedText variant="caption">{settings.defaultThreadEnvMode}</ThemedText>
                </SettingRow>
              </>
            )}
            {!settings && <ThemedText variant="caption">Loading settings...</ThemedText>}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: "#18181b",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#27272a",
    gap: 12,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  error: {
    color: "#ef4444",
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#27272a",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fafafa",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#3f3f46",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  button: {
    backgroundColor: "#6d28d9",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDanger: {
    backgroundColor: "#991b1b",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  providerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
});
