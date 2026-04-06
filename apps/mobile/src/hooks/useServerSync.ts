import { useEffect, useRef } from "react";

import { rpc, connectToServer, disconnectFromServer } from "../api/rpcClient";
import { useConnectionStore } from "../api/connection";
import { useAppStore } from "../stores/appStore";
import { useServerConfigStore } from "../stores/serverConfigStore";

export function useServerSync() {
  const config = useConnectionStore((s) => s.config);
  const status = useConnectionStore((s) => s.status);
  const syncSnapshot = useAppStore((s) => s.syncSnapshot);
  const applyEvent = useAppStore((s) => s.applyEvent);
  const setConfig = useServerConfigStore((s) => s.setConfig);
  const setSettings = useServerConfigStore((s) => s.setSettings);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (status !== "connected") return;

    let cancelled = false;

    async function bootstrap() {
      try {
        const [snapshot, serverConfig, settings] = await Promise.all([
          rpc.orchestration.getSnapshot(),
          rpc.server.getConfig(),
          rpc.server.getSettings(),
        ]);

        if (cancelled) return;

        syncSnapshot(snapshot);
        setConfig(serverConfig);
        setSettings(settings);

        unsubRef.current = rpc.orchestration.onDomainEvent((event) => {
          if (!cancelled) applyEvent(event);
        });
      } catch (err) {
        if (!cancelled) {
          useConnectionStore
            .getState()
            .setStatus("error", err instanceof Error ? err.message : "Bootstrap failed");
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [status, syncSnapshot, applyEvent, setConfig, setSettings]);

  return {
    connect: () => connectToServer(config),
    disconnect: disconnectFromServer,
    status,
    config,
  };
}
