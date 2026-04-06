import { create } from "zustand";

export interface ServerProviderModel {
  slug: string;
  name: string;
}

export interface ServerProvider {
  provider: "codex" | "claudeAgent";
  enabled: boolean;
  installed: boolean;
  status: string;
  auth: { status: string };
  models: ServerProviderModel[];
}

export interface ServerSettings {
  enableAssistantStreaming: boolean;
  defaultThreadEnvMode: string;
}

interface ServerConfigState {
  settings: ServerSettings | null;
  providers: ServerProvider[];
  setConfig: (config: any) => void;
  setSettings: (settings: any) => void;
}

export const useServerConfigStore = create<ServerConfigState>((set) => ({
  settings: null,
  providers: [],
  setConfig: (config: any) =>
    set({
      providers: config?.providers ?? [],
    }),
  setSettings: (settings: any) =>
    set({
      settings: settings
        ? {
            enableAssistantStreaming: settings.enableAssistantStreaming ?? false,
            defaultThreadEnvMode: settings.defaultThreadEnvMode ?? "local",
          }
        : null,
    }),
}));
