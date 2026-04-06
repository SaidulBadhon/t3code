import type {
  OrchestrationEvent,
  OrchestrationReadModel,
  OrchestrationThread,
  ModelSelection,
  ProjectId,
  ThreadId,
  RuntimeMode,
  ProviderInteractionMode,
  ProviderKind,
  OrchestrationSessionStatus,
} from "@t3tools/contracts";
import { create } from "zustand";

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
  status: OrchestrationSessionStatus;
  activeTurnId?: string;
  lastError?: string;
}

export interface Thread {
  id: ThreadId;
  projectId: ProjectId;
  title: string;
  modelSelection: ModelSelection;
  runtimeMode: RuntimeMode;
  interactionMode: ProviderInteractionMode;
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
  id: ProjectId;
  name: string;
  cwd: string;
  defaultModelSelection: ModelSelection | null;
}

interface AppState {
  projects: Project[];
  threads: Thread[];
  bootstrapComplete: boolean;
  syncSnapshot: (readModel: OrchestrationReadModel) => void;
  applyEvent: (event: OrchestrationEvent) => void;
  reset: () => void;
}

function mapThread(thread: OrchestrationThread): Thread {
  return {
    id: thread.id,
    projectId: thread.projectId,
    title: thread.title,
    modelSelection: thread.modelSelection,
    runtimeMode: thread.runtimeMode,
    interactionMode: thread.interactionMode,
    session: thread.session
      ? {
          provider: thread.session.providerName as ProviderKind | null,
          status: thread.session.status,
          activeTurnId: thread.session.activeTurnId ?? undefined,
          lastError: thread.session.lastError ?? undefined,
        }
      : null,
    messages: thread.messages.map((m) => ({
      id: m.id,
      role: m.role,
      text: m.text,
      turnId: m.turnId,
      createdAt: m.createdAt,
      streaming: m.streaming ?? false,
    })),
    error: null,
    createdAt: thread.createdAt,
    archivedAt: thread.archivedAt ?? null,
    updatedAt: thread.updatedAt,
    branch: thread.branch ?? null,
    worktreePath: thread.worktreePath ?? null,
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
      projects: readModel.projects.map((p) => ({
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
      switch (event.type) {
        case "project.created":
          return {
            projects: [
              ...state.projects,
              {
                id: event.payload.projectId,
                name: event.payload.title,
                cwd: event.payload.workspaceRoot,
                defaultModelSelection: event.payload.defaultModelSelection ?? null,
              },
            ],
          };

        case "project.deleted":
          return {
            projects: state.projects.filter((p) => p.id !== event.payload.projectId),
          };

        case "project.meta-updated": {
          const { projectId, title, workspaceRoot, defaultModelSelection } = event.payload;
          return {
            projects: state.projects.map((p) => {
              if (p.id !== projectId) return p;
              return {
                ...p,
                ...(title !== undefined ? { name: title } : {}),
                ...(workspaceRoot !== undefined ? { cwd: workspaceRoot } : {}),
                ...(defaultModelSelection !== undefined ? { defaultModelSelection } : {}),
              };
            }),
          };
        }

        case "thread.created":
          return {
            threads: [
              ...state.threads,
              {
                id: event.payload.threadId,
                projectId: event.payload.projectId,
                title: event.payload.title,
                modelSelection: event.payload.modelSelection,
                runtimeMode: event.payload.runtimeMode,
                interactionMode: event.payload.interactionMode,
                session: null,
                messages: [],
                error: null,
                createdAt: event.payload.createdAt,
                archivedAt: null,
                branch: event.payload.branch ?? null,
                worktreePath: event.payload.worktreePath ?? null,
              },
            ],
          };

        case "thread.deleted":
          return {
            threads: state.threads.filter((t) => t.id !== event.payload.threadId),
          };

        case "thread.archived":
          return {
            threads: updateThread(state.threads, event.payload.threadId, (t) => ({
              ...t,
              archivedAt: event.occurredAt,
            })),
          };

        case "thread.unarchived":
          return {
            threads: updateThread(state.threads, event.payload.threadId, (t) => ({
              ...t,
              archivedAt: null,
            })),
          };

        case "thread.meta-updated": {
          const { threadId, title, modelSelection, branch, worktreePath } = event.payload;
          return {
            threads: updateThread(state.threads, threadId, (t) => ({
              ...t,
              ...(title !== undefined ? { title } : {}),
              ...(modelSelection !== undefined ? { modelSelection } : {}),
              ...(branch !== undefined ? { branch } : {}),
              ...(worktreePath !== undefined ? { worktreePath } : {}),
              updatedAt: event.payload.updatedAt,
            })),
          };
        }

        case "thread.message-sent": {
          const { threadId, messageId, role, text, turnId, streaming, createdAt } = event.payload;
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
            threads: updateThread(state.threads, event.payload.threadId, (t) => ({
              ...t,
              session: {
                provider: event.payload.session.providerName as ProviderKind | null,
                status: event.payload.session.status,
                activeTurnId: event.payload.session.activeTurnId ?? undefined,
                lastError: event.payload.session.lastError ?? undefined,
              },
            })),
          };

        case "thread.runtime-mode-set":
          return {
            threads: updateThread(state.threads, event.payload.threadId, (t) => ({
              ...t,
              runtimeMode: event.payload.runtimeMode,
            })),
          };

        case "thread.interaction-mode-set":
          return {
            threads: updateThread(state.threads, event.payload.threadId, (t) => ({
              ...t,
              interactionMode: event.payload.interactionMode,
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
