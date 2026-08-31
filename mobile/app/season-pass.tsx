import { useCallback, useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import { Body, Button, Card, GlowText, H1, H2, Muted, Screen } from "../src/components/ui";
import { apiFetch, ApiError } from "../src/lib/api";
import { colors, spacing } from "../src/lib/theme";

interface Reward {
  id: string;
  track: "FREE" | "PREMIUM";
  thresholdType: string;
  thresholdValue: number;
  owned: boolean;
  progressValue: number;
  item: { name: string };
}

interface Pass {
  id: string;
  name: string;
  theme: string | null;
  priceCents: number;
  premiumUnlocked: boolean;
  rewards: Reward[];
}

const THRESHOLD_LABEL: Record<string, string> = {
  ROUNDS_COMPLETED: "rounds completed",
  HOLES_LOGGED: "holes logged",
  FRIENDS_PLAYED_WITH: "friends played with",
  INVITES_CONVERTED: "invites converted",
};

export default function SeasonPassScreen() {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await apiFetch<{ passes: Pass[] }>("/api/progress");
    setPasses(data.passes);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function unlockPremium(id: string) {
    setError(null);
    try {
      await apiFetch(`/api/season-passes/${id}/purchase-premium`, { json: {} });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't unlock premium");
    }
  }

  return (
    <Screen>
      <FlatList
        data={passes}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.sm }}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.sm }}>
            <H1>Season Pass</H1>
            {error && <Body style={{ color: colors.danger, marginTop: spacing.sm }}>{error}</Body>}
          </View>
        }
        ListEmptyComponent={<Muted>No active pass right now.</Muted>}
        renderItem={({ item: pass }) => (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.md }}>
              <View style={{ flex: 1 }}>
                <H2>{pass.name}</H2>
                {pass.theme && <Muted>{pass.theme}</Muted>}
              </View>
              {pass.premiumUnlocked ? (
                <Body style={{ color: colors.accent }}>Premium unlocked</Body>
              ) : (
                <Button title={`Unlock — $${(pass.priceCents / 100).toFixed(2)}`} onPress={() => unlockPremium(pass.id)} />
              )}
            </View>

            {(["FREE", "PREMIUM"] as const).map((track) => (
              <View key={track} style={{ marginBottom: spacing.md }}>
                <Muted style={{ textTransform: "uppercase", letterSpacing: 1, marginBottom: spacing.xs }}>{track} track</Muted>
                <View style={{ gap: spacing.sm }}>
                  {pass.rewards
                    .filter((r) => r.track === track)
                    .map((r) => (
                      <View
                        key={r.id}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: r.owned ? colors.accent : colors.border,
                          borderRadius: 10,
                          padding: spacing.sm,
                        }}
                      >
                        <View>
                          <Body>{r.item.name}</Body>
                          <Muted>
                            {r.progressValue}/{r.thresholdValue} {THRESHOLD_LABEL[r.thresholdType]}
                          </Muted>
                        </View>
                        {r.owned ? (
                          <GlowText style={{ fontSize: 12 }}>Owned</GlowText>
                        ) : (
                          <Muted>Locked</Muted>
                        )}
                      </View>
                    ))}
                </View>
              </View>
            ))}
          </Card>
        )}
      />
    </Screen>
  );
}
