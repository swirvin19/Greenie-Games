import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import { Body, Button, Card, H1, H2, Input, Muted, Screen } from "../../src/components/ui";
import { apiFetch, ApiError } from "../../src/lib/api";
import { spacing } from "../../src/lib/theme";

interface FriendRow {
  friendshipId: string;
  status: string;
  requestedByMe: boolean;
  user: { id: string; displayName: string };
}

interface UserSearchResult {
  id: string;
  displayName: string;
  email: string | null;
}

export default function FriendsScreen() {
  const [accepted, setAccepted] = useState<FriendRow[]>([]);
  const [incoming, setIncoming] = useState<FriendRow[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRow[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await apiFetch<{ accepted: FriendRow[]; incomingPending: FriendRow[]; outgoingPending: FriendRow[] }>(
      "/api/friends"
    );
    setAccepted(data.accepted);
    setIncoming(data.incomingPending);
    setOutgoing(data.outgoingPending);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      apiFetch<{ users: UserSearchResult[] }>(`/api/users?q=${encodeURIComponent(query)}`).then((d) =>
        setResults(d.users)
      );
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function sendRequest(email: string) {
    setError(null);
    setNotice(null);
    try {
      await apiFetch("/api/friends", { json: { email } });
      setNotice("Friend request sent");
      setQuery("");
      setResults([]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send request");
    }
  }

  async function respond(friendshipId: string, action: "accept" | "block") {
    await apiFetch(`/api/friends/${friendshipId}`, { method: "PATCH", json: { action } });
    await load();
  }

  async function cancel(friendshipId: string) {
    await apiFetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
    await load();
  }

  return (
    <Screen>
      <FlatList
        data={[1]}
        keyExtractor={() => "content"}
        contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxl }}
        renderItem={() => (
          <View style={{ gap: spacing.lg }}>
            <H1>Friends</H1>

            <Card>
              <H2 style={{ marginBottom: spacing.sm }}>Add a friend</H2>
              <Input placeholder="Search by name or email…" value={query} onChangeText={setQuery} autoCapitalize="none" />
              {notice && <Body style={{ color: "#cfe600", marginTop: spacing.xs }}>{notice}</Body>}
              {error && <Body style={{ color: "#ff6b6b", marginTop: spacing.xs }}>{error}</Body>}
              {results.map((r) => (
                <View
                  key={r.id}
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm }}
                >
                  <Body>{r.displayName}</Body>
                  <Button title="Add" variant="secondary" onPress={() => r.email && sendRequest(r.email)} />
                </View>
              ))}
            </Card>

            {incoming.length > 0 && (
              <Card>
                <H2 style={{ marginBottom: spacing.sm }}>Requests</H2>
                {incoming.map((f) => (
                  <View
                    key={f.friendshipId}
                    style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, gap: spacing.sm }}
                  >
                    <Body>{f.user.displayName}</Body>
                    <View style={{ flexDirection: "row", gap: spacing.sm }}>
                      <Button title="Accept" onPress={() => respond(f.friendshipId, "accept")} />
                      <Button title="Decline" variant="secondary" onPress={() => cancel(f.friendshipId)} />
                    </View>
                  </View>
                ))}
              </Card>
            )}

            {outgoing.length > 0 && (
              <Card>
                <H2 style={{ marginBottom: spacing.sm }}>Sent requests</H2>
                {outgoing.map((f) => (
                  <View
                    key={f.friendshipId}
                    style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm }}
                  >
                    <Muted>{f.user.displayName} — pending</Muted>
                    <Button title="Cancel" variant="secondary" onPress={() => cancel(f.friendshipId)} />
                  </View>
                ))}
              </Card>
            )}

            <Card>
              <H2 style={{ marginBottom: spacing.sm }}>Your friends</H2>
              {accepted.length === 0 && <Muted>No friends yet.</Muted>}
              {accepted.map((f) => (
                <Body key={f.friendshipId} style={{ paddingVertical: spacing.xs }}>
                  {f.user.displayName}
                </Body>
              ))}
            </Card>
          </View>
        )}
      />
    </Screen>
  );
}
