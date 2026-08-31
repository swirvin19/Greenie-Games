"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/client-api";
import { useSession } from "@/components/session-provider";

interface Message {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  sender: { displayName: string };
}

export function ThreadPanel({ threadId, title }: { threadId: string; title?: string }) {
  const { user } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const data = await apiFetch<{ messages: Message[] }>(`/api/threads/${threadId}/messages`);
    setMessages(data.messages);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!text.trim()) return;
    setError(null);
    try {
      await apiFetch(`/api/threads/${threadId}/messages`, { json: { body: text } });
      setText("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send message");
    }
  }

  async function report(messageId: string) {
    const reason = prompt("Why are you reporting this message?");
    if (!reason) return;
    await apiFetch(`/api/messages/${messageId}/report`, { json: { reason } });
    alert("Reported. Thanks for flagging it.");
  }

  async function block(userId: string) {
    if (!confirm("Block this person? They won't be able to message you.")) return;
    await apiFetch("/api/blocks", { json: { userId } });
    await load();
  }

  return (
    <section className="card flex flex-col gap-3 p-4">
      <h2 className="font-semibold">{title ?? "Chat"}</h2>
      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className="group flex items-start justify-between gap-2 text-sm">
            <div>
              <span className="font-medium">{m.sender.displayName}: </span>
              {m.body}
            </div>
            {m.senderId !== user?.id && (
              <span className="hidden shrink-0 gap-2 group-hover:flex">
                <button onClick={() => report(m.id)} className="text-xs text-[var(--muted)] hover:underline">
                  Report
                </button>
                <button onClick={() => block(m.senderId)} className="text-xs text-[var(--muted)] hover:underline">
                  Block
                </button>
              </span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Say something…"
          className="flex-1"
        />
        <button className="btn-primary" onClick={send}>
          Send
        </button>
      </div>
    </section>
  );
}
