import { useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import { Body, Button, Card, Chip, H1, H2, Muted, Screen } from "../src/components/ui";
import { apiFetch, ApiError } from "../src/lib/api";
import { useAuth } from "../src/lib/auth-context";
import { spacing } from "../src/lib/theme";

interface Friend {
  friendshipId: string;
  user: { id: string; displayName: string };
}

interface InventoryEntry {
  id: string;
  item: { id: string; name: string; tradeable: boolean };
}

interface TradeRow {
  id: string;
  status: string;
  fromUserId: string;
  toUserId: string;
  fromUser: { displayName: string };
  toUser: { displayName: string };
  fromItem: { item: { name: string } };
  toItem: { item: { name: string } };
}

export default function TradeScreen() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [myItems, setMyItems] = useState<InventoryEntry[]>([]);
  const [theirItems, setTheirItems] = useState<InventoryEntry[]>([]);
  const [selectedFriend, setSelectedFriend] = useState("");
  const [myItemId, setMyItemId] = useState("");
  const [theirItemId, setTheirItemId] = useState("");
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadTrades() {
    const data = await apiFetch<{ trades: TradeRow[] }>("/api/trades");
    setTrades(data.trades);
  }

  useEffect(() => {
    apiFetch<{ accepted: Friend[] }>("/api/friends").then((d) => setFriends(d.accepted));
    apiFetch<{ items: InventoryEntry[] }>("/api/inventory").then((d) => setMyItems(d.items.filter((i) => i.item.tradeable)));
    loadTrades();
  }, []);

  useEffect(() => {
    if (!selectedFriend) {
      setTheirItems([]);
      return;
    }
    apiFetch<{ items: InventoryEntry[] }>(`/api/users/${selectedFriend}/inventory`).then((d) => setTheirItems(d.items));
  }, [selectedFriend]);

  async function propose() {
    setError(null);
    try {
      await apiFetch("/api/trades", {
        json: { toUserId: selectedFriend, fromInventoryItemId: myItemId, toInventoryItemId: theirItemId },
      });
      setMyItemId("");
      setTheirItemId("");
      await loadTrades();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't propose trade");
    }
  }

  async function respond(id: string, action: "accept" | "decline" | "cancel") {
    await apiFetch(`/api/trades/${id}`, { method: "PATCH", json: { action } });
    await loadTrades();
  }

  return (
    <Screen>
      <FlatList
        data={[1]}
        keyExtractor={() => "content"}
        contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.sm }}
        renderItem={() => (
          <View style={{ gap: spacing.lg }}>
            <H1>Trade</H1>
            <Card>
              <H2 style={{ marginBottom: spacing.sm }}>Propose a trade</H2>
              <Muted style={{ marginBottom: spacing.xs }}>Friend</Muted>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }}>
                {friends.map((f) => (
                  <Chip key={f.user.id} label={f.user.displayName} active={selectedFriend === f.user.id} onPress={() => setSelectedFriend(f.user.id)} />
                ))}
                {friends.length === 0 && <Muted>Add friends first.</Muted>}
              </View>

              <Muted style={{ marginBottom: spacing.xs }}>Your item</Muted>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }}>
                {myItems.map((i) => (
                  <Chip key={i.id} label={i.item.name} active={myItemId === i.id} onPress={() => setMyItemId(i.id)} />
                ))}
                {myItems.length === 0 && <Muted>No tradeable items yet.</Muted>}
              </View>

              {!!selectedFriend && (
                <>
                  <Muted style={{ marginBottom: spacing.xs }}>Their item</Muted>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }}>
                    {theirItems.map((i) => (
                      <Chip key={i.id} label={i.item.name} color="accent2" active={theirItemId === i.id} onPress={() => setTheirItemId(i.id)} />
                    ))}
                    {theirItems.length === 0 && <Muted>They have no tradeable items.</Muted>}
                  </View>
                </>
              )}

              {error && <Body style={{ color: "#ff6b6b", marginBottom: spacing.sm }}>{error}</Body>}
              <Button title="Propose trade" onPress={propose} disabled={!selectedFriend || !myItemId || !theirItemId} />
            </Card>

            <Card>
              <H2 style={{ marginBottom: spacing.sm }}>Your trades</H2>
              {trades.length === 0 && <Muted>No trades yet.</Muted>}
              {trades.map((t) => (
                <View key={t.id} style={{ marginBottom: spacing.md }}>
                  <Body>
                    {t.fromUser.displayName}'s {t.fromItem.item.name} ⇄ {t.toUser.displayName}'s {t.toItem.item.name} — {t.status}
                  </Body>
                  {t.status === "PENDING" && t.toUserId === user?.id && (
                    <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs }}>
                      <Button title="Accept" onPress={() => respond(t.id, "accept")} />
                      <Button title="Decline" variant="secondary" onPress={() => respond(t.id, "decline")} />
                    </View>
                  )}
                  {t.status === "PENDING" && t.fromUserId === user?.id && (
                    <Button title="Cancel" variant="secondary" onPress={() => respond(t.id, "cancel")} style={{ marginTop: spacing.xs, alignSelf: "flex-start" }} />
                  )}
                </View>
              ))}
            </Card>
          </View>
        )}
      />
    </Screen>
  );
}
