import { create } from "zustand";

export interface ConnectionConfig {
  host: string;
  port: number;
  authToken: string | null;
  useTls: boolean;
}

interface ConnectionState {
  config: ConnectionConfig;
  status: "disconnected" | "connecting" | "connected" | "error";
  errorMessage: string | null;
  setConfig: (config: Partial<ConnectionConfig>) => void;
  setStatus: (status: ConnectionState["status"], errorMessage?: string) => void;
}

const DEFAULT_CONFIG: ConnectionConfig = {
  host: "192.168.1.100",
  port: 3773,
  authToken: null,
  useTls: false,
};

export const useConnectionStore = create<ConnectionState>((set) => ({
  config: DEFAULT_CONFIG,
  status: "disconnected",
  errorMessage: null,
  setConfig: (partial) =>
    set((state) => ({
      config: { ...state.config, ...partial },
    })),
  setStatus: (status, errorMessage) => set({ status, errorMessage: errorMessage ?? null }),
}));

export function buildWsUrl(config: ConnectionConfig): string {
  const protocol = config.useTls ? "wss" : "ws";
  const tokenParam = config.authToken ? `?token=${encodeURIComponent(config.authToken)}` : "";
  return `${protocol}://${config.host}:${config.port}/ws${tokenParam}`;
}
