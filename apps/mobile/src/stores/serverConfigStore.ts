import type { ServerConfig, ServerSettings, ServerProvider } from "@t3tools/contracts";
import { create } from "zustand";

interface ServerConfigState {
  config: ServerConfig | null;
  settings: ServerSettings | null;
  providers: readonly ServerProvider[];
  setConfig: (config: ServerConfig) => void;
  setSettings: (settings: ServerSettings) => void;
}

export const useServerConfigStore = create<ServerConfigState>((set) => ({
  config: null,
  settings: null,
  providers: [],
  setConfig: (config) =>
    set({
      config,
      providers: config.providers,
    }),
  setSettings: (settings) => set({ settings }),
}));
