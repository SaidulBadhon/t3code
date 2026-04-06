import { create } from "zustand";

export type ProviderKind = "codex" | "claudeAgent";
export type RuntimeMode = "approval-required" | "full-access";
export type InteractionMode = "default" | "plan";
export type SessionStatus =
  | "idle"
  | "starting"
  | "running"
  | "ready"
  | "interrupted"
  | "stopped"
  | "error";

export interface ModelSelection {
  provider: ProviderKind;
  model: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  turnId?: string | null;
  createdAt: string;
  streaming: boolean;
}

export interface ThreadSession {
  provider: ProviderKind | null;
  status: SessionStatus;
  activeTurnId?: string;
  lastError?: string;
}

export interface Thread {
  id: string;
  projectId: string;
  title: string;
  modelSelection: ModelSelection;
  runtimeMode: RuntimeMode;
  interactionMode: InteractionMode;
  session: ThreadSession | null;
  messages: ChatMessage[];
  error: string | null;
  createdAt: string;
  archivedAt: string | null;
  updatedAt?: string;
  branch: string | null;
  worktreePath: string | null;
}

export interface Project {
  id: string;
  name: string;
  cwd: string;
  defaultModelSelection: ModelSelection | null;
}

interface OrchestrationEvent {
  type: string;
  occurredAt: string;
  payload: any;
}

interface OrchestrationReadModel {
  projects: any[];
  threads: any[];
}

interface AppState {
  projects: Project[];
  threads: Thread[];
  bootstrapComplete: boolean;
  syncSnapshot: (readModel: OrchestrationReadModel) => void;
  applyEvent: (event: OrchestrationEvent) => void;
  reset: () => void;
}

function mapThread(raw: any): Thread {
  return {
    id: raw.id,
    projectId: raw.projectId,
    title: raw.title,
    modelSelection: raw.modelSelection,
    runtimeMode: raw.runtimeMode ?? "full-access",
    interactionMode: raw.interactionMode ?? "default",
    session: raw.session
      ? {
          provider: raw.session.providerName ?? null,
          status: raw.session.status,
          activeTurnId: raw.session.activeTurnId ?? undefined,
          lastError: raw.session.lastError ?? undefined,
        }
      : null,
    messages: (raw.messages ?? []).map((m: any) => ({
      id: m.id,
      role: m.role,
      text: m.text,
      turnId: m.turnId,
      createdAt: m.createdAt,
      streaming: m.streaming ?? false,
    })),
    error: null,
    createdAt: raw.createdAt,
    archivedAt: raw.archivedAt ?? null,
    updatedAt: raw.updatedAt,
    branch: raw.branch ?? null,
    worktreePath: raw.worktreePath ?? null,
  };
}

function updateThread(
  threads: Thread[],
  threadId: string,
  updater: (t: Thread) => Thread,
): Thread[] {
  return threads.map((t) => (t.id === threadId ? updater(t) : t));
}

export const useAppStore = create<AppState>((set) => ({
  projects: [],
  threads: [],
  bootstrapComplete: false,

  syncSnapshot: (readModel) =>
    set({
      projects: readModel.projects.map((p: any) => ({
        id: p.id,
        name: p.title,
        cwd: p.workspaceRoot,
        defaultModelSelection: p.defaultModelSelection ?? null,
      })),
      threads: readModel.threads.map(mapThread),
      bootstrapComplete: true,
    }),

  applyEvent: (event) =>
    set((state) => {
      const p = event.payload;
      switch (event.type) {
        case "project.created":
          return {
            projects: [
              ...state.projects,
              {
                id: p.projectId,
                name: p.title,
                cwd: p.workspaceRoot,
                defaultModelSelection: p.defaultModelSelection ?? null,
              },
            ],
          };

        case "project.deleted":
          return {
            projects: state.projects.filter((proj) => proj.id !== p.projectId),
          };

        case "project.meta-updated":
          return {
            projects: state.projects.map((proj) => {
              if (proj.id !== p.projectId) return proj;
              return {
                ...proj,
                ...(p.title !== undefined ? { name: p.title } : {}),
                ...(p.workspaceRoot !== undefined ? { cwd: p.workspaceRoot } : {}),
                ...(p.defaultModelSelection !== undefined
                  ? { defaultModelSelection: p.defaultModelSelection }
                  : {}),
              };
            }),
          };

        case "thread.created":
          return {
            threads: [
              ...state.threads,
              {
                id: p.threadId,
                projectId: p.projectId,
                title: p.title,
                modelSelection: p.modelSelection,
                runtimeMode: p.runtimeMode ?? "full-access",
                interactionMode: p.interactionMode ?? "default",
                session: null,
                messages: [],
                error: null,
                createdAt: p.createdAt ?? event.occurredAt,
                archivedAt: null,
                branch: p.branch ?? null,
                worktreePath: p.worktreePath ?? null,
              },
            ],
          };

        case "thread.deleted":
          return {
            threads: state.threads.filter((t) => t.id !== p.threadId),
          };

        case "thread.archived":
          return {
            threads: updateThread(state.threads, p.threadId, (t) => ({
              ...t,
              archivedAt: event.occurredAt,
            })),
          };

        case "thread.unarchived":
          return {
            threads: updateThread(state.threads, p.threadId, (t) => ({
              ...t,
              archivedAt: null,
            })),
          };

        case "thread.meta-updated":
          return {
            threads: updateThread(state.threads, p.threadId, (t) => ({
              ...t,
              ...(p.title !== undefined ? { title: p.title } : {}),
              ...(p.modelSelection !== undefined ? { modelSelection: p.modelSelection } : {}),
              ...(p.branch !== undefined ? { branch: p.branch } : {}),
              ...(p.worktreePath !== undefined ? { worktreePath: p.worktreePath } : {}),
              updatedAt: p.updatedAt,
            })),
          };

        case "thread.message-sent": {
          const { threadId, messageId, role, text, turnId, streaming, createdAt } = p;
          return {
            threads: updateThread(state.threads, threadId, (t) => {
              const existing = t.messages.find((m) => m.id === messageId);
              if (existing) {
                return {
                  ...t,
                  messages: t.messages.map((m) =>
                    m.id === messageId
                      ? {
                          ...m,
                          text: streaming ? `${m.text}${text}` : text.length > 0 ? text : m.text,
                          streaming: streaming ?? false,
                        }
                      : m,
                  ),
                };
              }
              return {
                ...t,
                messages: [
                  ...t.messages,
                  {
                    id: messageId,
                    role,
                    text,
                    turnId: turnId ?? null,
                    createdAt,
                    streaming: streaming ?? false,
                  },
                ],
              };
            }),
          };
        }

        case "thread.session-set":
          return {
            threads: updateThread(state.threads, p.threadId, (t) => ({
              ...t,
              session: {
                provider: p.session?.providerName ?? null,
                status: p.session?.status ?? "idle",
                activeTurnId: p.session?.activeTurnId ?? undefined,
                lastError: p.session?.lastError ?? undefined,
              },
            })),
          };

        case "thread.runtime-mode-set":
          return {
            threads: updateThread(state.threads, p.threadId, (t) => ({
              ...t,
              runtimeMode: p.runtimeMode,
            })),
          };

        case "thread.interaction-mode-set":
          return {
            threads: updateThread(state.threads, p.threadId, (t) => ({
              ...t,
              interactionMode: p.interactionMode,
            })),
          };

        default:
          return state;
      }
    }),

  reset: () =>
    set({
      projects: [],
      threads: [],
      bootstrapComplete: false,
    }),
}));
