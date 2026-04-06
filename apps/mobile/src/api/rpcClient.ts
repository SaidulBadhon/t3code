import type {
  ClientOrchestrationCommand,
  OrchestrationEvent,
  OrchestrationReadModel,
  ServerConfig,
  ServerSettings,
  ServerSettingsPatch,
} from "@t3tools/contracts";
import { ORCHESTRATION_WS_METHODS, WS_METHODS, WsRpcGroup } from "@t3tools/contracts";
import { Effect, Layer, ManagedRuntime, Scope, Stream } from "effect";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";
import * as Socket from "effect/unstable/socket/Socket";

import { buildWsUrl, useConnectionStore, type ConnectionConfig } from "./connection";

const makeWsRpcProtocolClient = RpcClient.make(WsRpcGroup);

type RpcClientFactory = typeof makeWsRpcProtocolClient;
type WsRpcProtocolClient =
  RpcClientFactory extends Effect.Effect<infer Client, any, any> ? Client : never;

interface TransportSession {
  readonly clientPromise: Promise<WsRpcProtocolClient>;
  readonly clientScope: Scope.Closeable;
  readonly runtime: ManagedRuntime.ManagedRuntime<RpcClient.Protocol, never>;
}

function createRpcProtocolLayer(wsUrl: string) {
  const wsConstructorLayer = Layer.succeed(
    Socket.WebSocketConstructor,
    (url: string, protocols?: string | string[]) => new globalThis.WebSocket(url, protocols),
  );
  const socketLayer = Socket.layerWebSocket(wsUrl).pipe(Layer.provide(wsConstructorLayer));
  const protocolLayer = Layer.effect(
    RpcClient.Protocol,
    RpcClient.makeProtocolSocket({ retryTransientErrors: true }),
  );
  return protocolLayer.pipe(Layer.provide(Layer.mergeAll(socketLayer, RpcSerialization.layerJson)));
}

class MobileRpcTransport {
  private disposed = false;
  private session: TransportSession | null = null;

  connect(config: ConnectionConfig) {
    this.dispose();
    this.disposed = false;
    const wsUrl = buildWsUrl(config);

    const runtime = ManagedRuntime.make(createRpcProtocolLayer(wsUrl));
    const clientScope = runtime.runSync(Scope.make());
    this.session = {
      runtime,
      clientScope,
      clientPromise: runtime.runPromise(Scope.provide(clientScope)(makeWsRpcProtocolClient)),
    };
  }

  async request<TSuccess>(
    execute: (client: WsRpcProtocolClient) => Effect.Effect<TSuccess, Error, never>,
  ): Promise<TSuccess> {
    if (this.disposed || !this.session) {
      throw new Error("Transport not connected");
    }
    const session = this.session;
    const client = await session.clientPromise;
    return await session.runtime.runPromise(Effect.suspend(() => execute(client)));
  }

  subscribe<TValue>(
    connect: (client: WsRpcProtocolClient) => Stream.Stream<TValue, Error, never>,
    listener: (value: TValue) => void,
  ): () => void {
    if (this.disposed || !this.session) {
      return () => undefined;
    }

    let active = true;
    const session = this.session;

    void (async () => {
      while (active && !this.disposed && session === this.session) {
        try {
          const client = await session.clientPromise;
          await session.runtime.runPromise(
            Stream.runForEach(connect(client), (value) =>
              Effect.sync(() => {
                if (active) listener(value);
              }),
            ),
          );
        } catch {
          if (!active || this.disposed) return;
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    })();

    return () => {
      active = false;
    };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.session) {
      const session = this.session;
      this.session = null;
      session.runtime
        .runPromise(Scope.close(session.clientScope, { _tag: "Success", value: undefined } as any))
        .catch(() => {})
        .finally(() => session.runtime.dispose());
    }
  }
}

const transport = new MobileRpcTransport();

export function connectToServer(config: ConnectionConfig): void {
  const store = useConnectionStore.getState();
  store.setStatus("connecting");
  try {
    transport.connect(config);
    store.setStatus("connected");
  } catch (err) {
    store.setStatus("error", err instanceof Error ? err.message : String(err));
  }
}

export function disconnectFromServer(): void {
  transport.dispose();
  useConnectionStore.getState().setStatus("disconnected");
}

export const rpc = {
  orchestration: {
    getSnapshot: (): Promise<OrchestrationReadModel> =>
      transport.request((c) => c[ORCHESTRATION_WS_METHODS.getSnapshot]({})),
    dispatchCommand: (input: ClientOrchestrationCommand): Promise<{ sequence: number }> =>
      transport.request((c) => c[ORCHESTRATION_WS_METHODS.dispatchCommand](input)),
    onDomainEvent: (listener: (event: OrchestrationEvent) => void): (() => void) =>
      transport.subscribe((c) => c[WS_METHODS.subscribeOrchestrationDomainEvents]({}), listener),
  },
  server: {
    getConfig: (): Promise<ServerConfig> =>
      transport.request((c) => c[WS_METHODS.serverGetConfig]({})),
    getSettings: (): Promise<ServerSettings> =>
      transport.request((c) => c[WS_METHODS.serverGetSettings]({})),
    updateSettings: (patch: ServerSettingsPatch): Promise<ServerSettings> =>
      transport.request((c) => c[WS_METHODS.serverUpdateSettings]({ patch })),
  },
};
