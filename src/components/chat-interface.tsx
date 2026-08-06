"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";
import type { ChatSessionRecord } from "@/modules/ai";
import {
  createChatSessionAction,
  getChatSessionAction,
  listChatSessionsAction,
  renameChatSessionAction,
  deleteChatSessionAction,
} from "@/modules/ai";
import { Bot, Plus, Send, Trash2, Pencil, Check, X, MessageSquare } from "lucide-react";

interface ChatInterfaceProps {
  projectId: string;
  initialSessions: ChatSessionRecord[];
}

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function ChatInterface({ projectId, initialSessions }: ChatInterfaceProps): React.ReactElement {
  const [sessions, setSessions] = React.useState<ChatSessionRecord[]>(initialSessions);
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameTitle, setRenameTitle] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadSession = React.useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const session = await getChatSessionAction(sessionId);
      if (!session) {
        setError("Session not found.");
        return;
      }
      setSelectedSessionId(session.id);
      setMessages(
        session.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })),
      );
    } catch {
      setError("Failed to load session.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSessions = React.useCallback(async () => {
    const { items } = await listChatSessionsAction(projectId);
    setSessions(items);
  }, [projectId]);

  const handleNewSession = async () => {
    const formData = new FormData();
    formData.append("projectId", projectId);
    const result = await createChatSessionAction(undefined, formData);
    if (result?.ok && result.session) {
      await refreshSessions();
      setSelectedSessionId(result.session.id);
      setMessages([]);
    } else {
      setError(result?.error ?? "Failed to create session.");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const content = input.trim();
    setInput("");
    setError(null);

    if (!selectedSessionId) {
      await handleNewSession();
      if (!selectedSessionId) {
        setError("Create a session first.");
        return;
      }
    }

    const sessionId = selectedSessionId!;
    setMessages((prev) => [...prev, { role: "user", content }]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, projectId, content }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Failed to get a response.");
        setLoading(false);
        return;
      }

      if (!response.body) {
        setError("No response body.");
        setLoading(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "", isStreaming: true }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice("data: ".length).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            if (typeof parsed.chunk === "string") {
              assistantText += parsed.chunk;
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last && last.role === "assistant") {
                  last.content = assistantText;
                }
                return next;
              });
            } else if (parsed.error) {
              setError(parsed.error);
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }

      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "assistant") {
          last.isStreaming = false;
        }
        return next;
      });

      await refreshSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stream failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (sessionId: string) => {
    if (!renameTitle.trim()) {
      setRenamingId(null);
      return;
    }
    const formData = new FormData();
    formData.append("sessionId", sessionId);
    formData.append("title", renameTitle.trim());
    const result = await renameChatSessionAction(undefined, formData);
    if (result?.ok) {
      await refreshSessions();
    } else {
      setError(result?.error ?? "Failed to rename session.");
    }
    setRenamingId(null);
    setRenameTitle("");
  };

  const handleDelete = async (sessionId: string) => {
    const formData = new FormData();
    formData.append("sessionId", sessionId);
    const result = await deleteChatSessionAction(undefined, formData);
    if (result?.ok) {
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
        setMessages([]);
      }
      await refreshSessions();
    } else {
      setError(result?.error ?? "Failed to delete session.");
    }
  };

  const startRename = (session: ChatSessionRecord) => {
    setRenamingId(session.id);
    setRenameTitle(session.title ?? "New chat");
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden border-t">
      {/* Session sidebar */}
      <aside className="flex w-72 flex-col border-r bg-muted/30">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">Chats</h2>
          <Button variant="ghost" size="icon" onClick={handleNewSession} aria-label="New chat">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ul className="space-y-1 p-2">
            {sessions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">No chats yet.</li>
            ) : (
              sessions.map((session) => (
                <li
                  key={session.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                    selectedSessionId === session.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  <button
                    className="flex flex-1 items-center gap-2 text-left"
                    onClick={() => loadSession(session.id)}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    {renamingId === session.id ? (
                      <Input
                        value={renameTitle}
                        onChange={(e) => setRenameTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(session.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        className="h-6 px-1 py-0 text-sm"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate">{session.title ?? "New chat"}</span>
                    )}
                  </button>
                  {renamingId === session.id ? (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRename(session.id)}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRenamingId(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startRename(session)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(session.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      </aside>

      {/* Chat area */}
      <main className="flex flex-1 flex-col bg-background">
        <div className="border-b px-6 py-4">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Chat
          </h1>
          <p className="text-xs text-muted-foreground">Ask anything about your store, customers, or marketing.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <Bot className="mb-4 h-12 w-12 opacity-20" />
              <p>Start a new conversation with your AI assistant.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex w-full",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border bg-card text-card-foreground",
                    )}
                  >
                    {message.role === "assistant" ? (
                      <Markdown content={message.content} />
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {loading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg border bg-card px-4 py-2 text-sm text-muted-foreground">
                    Thinking…
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="border-t bg-destructive/10 px-6 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="border-t p-4">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message…"
              rows={1}
              className="min-h-[48px] resize-none"
              disabled={loading}
            />
            <Button onClick={handleSend} disabled={!input.trim() || loading}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
