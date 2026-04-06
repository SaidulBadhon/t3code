import { buildWsUrl, useConnectionStore, type ConnectionConfig } from "./connection";

interface RpcRequest {
  _tag: "Request";
  id: number;
  tag: string;
  payload: Record<string, unknown>;
}

interface RpcResponse {
  _tag: "Exit" | "Chunk" | "ClientProtocolError" | "Defect";
  requestId?: number;
  exit?: { _tag: "Success" | "Failure"; value?: unknown; cause?: unknown };
  values?: unknown[];
}

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

type StreamListener = (value: unknown) => void;

class SimpleWsRpcClient {
  private ws: WebSocket | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();
  private streams = new Map<number, StreamListener>();
  private disposed = false;

  connect(config: ConnectionConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      this.dispose();
      this.disposed = false;
      const url = buildWsUrl(config);

      try {
        this.ws = new WebSocket(url);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      this.ws.addEventListener("open", () => resolve(), { once: true });

      this.ws.addEventListener(
        "error",
        () => {
          reject(new Error("WebSocket connection failed"));
        },
        { once: true },
      );

      this.ws.addEventListener("message", (event) => {
        this.handleMessage(String(event.data));
      });

      this.ws.addEventListener(
        "close",
        () => {
          for (const [, req] of this.pending) {
            req.reject(new Error("Connection closed"));
          }
          this.pending.clear();
          this.streams.clear();
          if (!this.disposed) {
            useConnectionStore.getState().setStatus("disconnected", "Connection lost");
          }
        },
        { once: true },
      );
    });
  }

  private handleMessage(raw: string): void {
    let messages: RpcResponse[];
    try {
      const parsed = JSON.parse(raw);
      messages = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return;
    }

    for (const msg of messages) {
      if (!msg || typeof msg !== "object") continue;
      const reqId = msg.requestId;
      if (reqId === undefined) continue;

      if (msg._tag === "Chunk") {
        const listener = this.streams.get(reqId);
        if (listener && msg.values) {
          for (const value of msg.values) {
            try {
              listener(value);
            } catch {
              // swallow listener errors
            }
          }
        }
      } else if (msg._tag === "Exit") {
        const req = this.pending.get(reqId);
        if (req) {
          this.pending.delete(reqId);
          if (msg.exit?._tag === "Failure") {
            req.reject(new Error(JSON.stringify(msg.exit.cause ?? "Request failed")));
          } else {
            req.resolve(msg.exit?.value);
          }
        }
        this.streams.delete(reqId);
      }
    }
  }

  request<T>(tag: string, payload: Record<string, unknown> = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("Not connected"));
        return;
      }

      const id = this.nextId++;
      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      });

      const message: RpcRequest = { _tag: "Request", id, tag, payload };
      try {
        this.ws.send(JSON.stringify([message]));
      } catch (err) {
        this.pending.delete(id);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  subscribe(tag: string, listener: StreamListener): () => void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return () => {};
    }

    const id = this.nextId++;
    this.streams.set(id, listener);

    const message: RpcRequest = { _tag: "Request", id, tag, payload: {} };
    try {
      this.ws.send(JSON.stringify([message]));
    } catch {
      this.streams.delete(id);
    }

    return () => {
      this.streams.delete(id);
    };
  }

  dispose() {
    this.disposed = true;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore close errors
      }
      this.ws = null;
    }
    for (const [, req] of this.pending) {
      req.reject(new Error("Disposed"));
    }
    this.pending.clear();
    this.streams.clear();
  }
}

const client = new SimpleWsRpcClient();

export async function connectToServer(config: ConnectionConfig): Promise<void> {
  const store = useConnectionStore.getState();
  store.setStatus("connecting");
  try {
    await client.connect(config);
    store.setStatus("connected");
  } catch (err) {
    store.setStatus("error", err instanceof Error ? err.message : String(err));
  }
}

export function disconnectFromServer(): void {
  client.dispose();
  useConnectionStore.getState().setStatus("disconnected");
}

export const rpc = {
  orchestration: {
    getSnapshot: () => client.request<any>("orchestration.getSnapshot", {}),
    dispatchCommand: (input: Record<string, unknown>) =>
      client.request<{ sequence: number }>("orchestration.dispatchCommand", input),
    replayEvents: (input: { fromSequenceExclusive: number }) =>
      client.request<any[]>("orchestration.replayEvents", input),
    onDomainEvent: (listener: (event: any) => void): (() => void) =>
      client.subscribe("subscribeOrchestrationDomainEvents", listener),
  },
  server: {
    getConfig: () => client.request<any>("server.getConfig", {}),
    getSettings: () => client.request<any>("server.getSettings", {}),
    updateSettings: (patch: Record<string, unknown>) =>
      client.request<any>("server.updateSettings", { patch }),
  },
  git: {
    status: (input: Record<string, unknown>) => client.request<any>("git.status", input),
    listBranches: (input: Record<string, unknown>) =>
      client.request<any>("git.listBranches", input),
    checkout: (input: Record<string, unknown>) => client.request<any>("git.checkout", input),
  },
};
