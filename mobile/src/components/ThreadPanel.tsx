import { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { apiFetch, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { colors, spacing } from "../lib/theme";
import { Body, Button, Card, GlowText, Input, Muted } from "./ui";

interface Message {
  id: string;
  body: string;
  senderId: string;
  sender: { displayName: string };
}

export function ThreadPanel({ threadId, title }: { threadId: string; title?: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  function messageActions(messageId: string, senderId: string) {
    Alert.alert("Message options", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        onPress: async () => {
          await apiFetch(`/api/messages/${messageId}/report`, { json: { reason: "Reported from app" } });
          Alert.alert("Reported", "Thanks for flagging it.");
        },
      },
      {
        text: "Block sender",
        style: "destructive",
        onPress: async () => {
          await apiFetch("/api/blocks", { json: { userId: senderId } });
          await load();
        },
      },
    ]);
  }

  return (
    <Card>
      <GlowText style={{ fontWeight: "700", marginBottom: spacing.sm }}>{title ?? "Chat"}</GlowText>
      <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
        {messages.length === 0 && <Muted>No messages yet.</Muted>}
        {messages.map((m) => (
          <Pressable key={m.id} onLongPress={() => m.senderId !== user?.id && messageActions(m.id, m.senderId)}>
            <Body>
              <Body style={{ fontWeight: "600" }}>{m.sender.displayName}: </Body>
              {m.body}
            </Body>
          </Pressable>
        ))}
      </View>
      {error && <Body style={{ color: colors.danger, marginBottom: spacing.sm }}>{error}</Body>}
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Input placeholder="Say something…" value={text} onChangeText={setText} style={{ flex: 1 }} onSubmitEditing={send} />
        <Button title="Send" onPress={send} />
      </View>
      <Muted style={{ marginTop: spacing.xs }}>Long-press a message to report or block.</Muted>
    </Card>
  );
}
