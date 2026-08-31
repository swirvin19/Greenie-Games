import { useCallback, useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import { Body, Button, Card, H1, H2, Muted, Screen } from "../src/components/ui";
import { apiFetch } from "../src/lib/api";
import { useAuth } from "../src/lib/auth-context";
import { spacing } from "../src/lib/theme";

interface BlockRow {
  id: string;
  blocked: { id: string; displayName: string };
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<BlockRow[]>([]);

  const load = useCallback(async () => {
    const data = await apiFetch<{ blocks: BlockRow[] }>("/api/blocks");
    setBlocks(data.blocks);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function unblock(id: string) {
    await apiFetch(`/api/blocks/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <Screen>
      <FlatList
        data={[1]}
        keyExtractor={() => "content"}
        contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.sm }}
        renderItem={() => (
          <View style={{ gap: spacing.lg }}>
            <H1>Profile</H1>
            <Card>
              <H2 style={{ marginBottom: spacing.sm }}>Account</H2>
              <Body style={{ fontWeight: "600" }}>{user?.displayName}</Body>
              <Muted>{user?.email}</Muted>
            </Card>
            <Card>
              <H2 style={{ marginBottom: spacing.sm }}>Blocked users</H2>
              {blocks.length === 0 && <Muted>Nobody blocked.</Muted>}
              {blocks.map((b) => (
                <View key={b.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.xs }}>
                  <Body>{b.blocked.displayName}</Body>
                  <Button title="Unblock" variant="secondary" onPress={() => unblock(b.blocked.id)} />
                </View>
              ))}
            </Card>
          </View>
        )}
      />
    </Screen>
  );
}
