import { useCallback, useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import { Body, Button, Card, H1, H2, Muted, Screen } from "../src/components/ui";
import { apiFetch } from "../src/lib/api";
import { spacing } from "../src/lib/theme";

interface InventoryEntry {
  id: string;
  equipped: boolean;
  item: { id: string; name: string; type: string; tradeable: boolean };
}

const TYPE_LABEL: Record<string, string> = {
  MASCOT_SKIN: "Mascot skin",
  COLOR_SCHEME: "Color scheme",
  BANNER_STYLE: "Banner style",
  ICON: "Icon",
};

export default function InventoryScreen() {
  const [items, setItems] = useState<InventoryEntry[]>([]);

  const load = useCallback(async () => {
    const data = await apiFetch<{ items: InventoryEntry[] }>("/api/inventory");
    setItems(data.items);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function equip(id: string) {
    await apiFetch(`/api/inventory/${id}/equip`, { json: {} });
    await load();
  }

  const byType = items.reduce<Record<string, InventoryEntry[]>>((acc, i) => {
    (acc[i.item.type] ??= []).push(i);
    return acc;
  }, {});

  return (
    <Screen>
      <FlatList
        data={Object.entries(byType)}
        keyExtractor={([type]) => type}
        contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.sm }}
        ListHeaderComponent={<H1 style={{ marginBottom: spacing.sm }}>Inventory</H1>}
        ListEmptyComponent={<Muted>Nothing yet — complete rounds to earn Season Pass cosmetics.</Muted>}
        renderItem={({ item: [type, entries] }) => (
          <Card>
            <H2 style={{ marginBottom: spacing.sm }}>{TYPE_LABEL[type] ?? type}</H2>
            <View style={{ gap: spacing.sm }}>
              {entries.map((e) => (
                <View
                  key={e.id}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}
                >
                  <View style={{ flex: 1 }}>
                    <Body>{e.item.name}</Body>
                    {!e.item.tradeable && <Muted>Not tradeable</Muted>}
                  </View>
                  {e.equipped ? (
                    <Body style={{ color: "#cfe600" }}>Equipped</Body>
                  ) : (
                    <Button title="Equip" variant="secondary" onPress={() => equip(e.id)} />
                  )}
                </View>
              ))}
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
