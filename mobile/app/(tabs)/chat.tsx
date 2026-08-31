import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { Body, Button, Card, Chip, H1, Muted, Screen } from "../../src/components/ui";
import { apiFetch, ApiError } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth-context";
import { spacing } from "../../src/lib/theme";

interface Friend {
  friendshipId: string;
  user: { id: string; displayName: string };
}

interface ThreadRow {
  id: string;
  type: string;
  participants: { user: { id: string; displayName: string } }[];
  messages: { body: string; createdAt: string }[];
}

export default function ChatListScreen() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await apiFetch<{ threads: ThreadRow[] }>("/api/threads");
    setThreads(data.threads.filter((t) => t.type !== "ROUND"));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      apiFetch<{ accepted: Friend[] }>("/api/friends").then((d) => setFriends(d.accepted));
    }, [load])
  );

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function startChat() {
    setError(null);
    try {
      const { thread } = await apiFetch<{ thread: { id: string } }>("/api/threads", {
        json: { participantIds: selected },
      });
      setSelected([]);
      router.push(`/chat/${thread.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start chat");
    }
  }

  return (
    <Screen>
      <FlatList
        data={threads}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, marginBottom: spacing.lg }}>
            <H1>Chat</H1>
            <Card>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }}>
                {friends.map((f) => (
                  <Chip
                    key={f.user.id}
                    label={f.user.displayName}
                    active={selected.includes(f.user.id)}
                    onPress={() => toggle(f.user.id)}
                  />
                ))}
              </View>
              {error && <Body style={{ color: "#ff6b6b", marginBottom: spacing.sm }}>{error}</Body>}
              <Button title="Start chat" onPress={startChat} disabled={selected.length === 0} />
            </Card>
          </View>
        }
        ListEmptyComponent={<Muted>No chats yet.</Muted>}
        renderItem={({ item }) => {
          const others = item.participants.filter((p) => p.user.id !== user?.id).map((p) => p.user.displayName);
          return (
            <Pressable onPress={() => router.push(`/chat/${item.id}`)}>
              <Card>
                <Body style={{ fontWeight: "600" }}>{others.join(", ") || "Just you"}</Body>
                <Muted numberOfLines={1}>{item.messages[0]?.body ?? "No messages yet"}</Muted>
              </Card>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
