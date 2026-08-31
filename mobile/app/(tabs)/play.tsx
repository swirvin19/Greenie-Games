import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { Body, Button, Card, H2, Muted, PressableRow, Screen } from "../../src/components/ui";
import { apiFetch } from "../../src/lib/api";
import { spacing } from "../../src/lib/theme";

interface RoundSummary {
  id: string;
  status: "IN_PROGRESS" | "COMPLETED";
  courseName: string | null;
  course: { name: string } | null;
  owner: { id: string; displayName: string };
  startedAt: string;
}

export default function PlayScreen() {
  const [rounds, setRounds] = useState<{ mine: RoundSummary[]; following: RoundSummary[] } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await apiFetch<{ mine: RoundSummary[]; following: RoundSummary[] }>("/api/rounds");
    setRounds(data);
  }, []);

  // Refetches whenever this tab regains focus (e.g. after creating a round
  // on the pushed /rounds/new screen and navigating back), not just once
  // on first mount — React Navigation keeps tab screens mounted, so a
  // plain useEffect never re-runs on a return visit.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const inProgress = rounds?.mine.filter((r) => r.status === "IN_PROGRESS") ?? [];
  const completed = rounds?.mine.filter((r) => r.status === "COMPLETED") ?? [];

  return (
    <Screen>
      <FlatList
        data={[1]}
        keyExtractor={() => "content"}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#cfe600" />}
        contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxl }}
        renderItem={() => (
          <View style={{ gap: spacing.lg }}>
            <Button title="Start a round" onPress={() => router.push("/rounds/new")} />

            {inProgress.length > 0 && (
              <Card>
                <H2 style={{ marginBottom: spacing.sm }}>In progress</H2>
                {inProgress.map((r) => (
                  <PressableRow key={r.id} onPress={() => router.push(`/rounds/${r.id}`)}>
                    <Body>{r.course?.name ?? r.courseName ?? "Round"}</Body>
                  </PressableRow>
                ))}
              </Card>
            )}

            {rounds && rounds.following.length > 0 && (
              <Card>
                <H2 style={{ marginBottom: spacing.sm }}>Following</H2>
                {rounds.following.map((r) => (
                  <PressableRow key={r.id} onPress={() => router.push(`/rounds/${r.id}`)}>
                    <Body>
                      {r.owner.displayName} — {r.course?.name ?? r.courseName ?? "Round"} ({r.status})
                    </Body>
                  </PressableRow>
                ))}
              </Card>
            )}

            <Card>
              <H2 style={{ marginBottom: spacing.sm }}>Recent rounds</H2>
              {completed.length === 0 && <Muted>No completed rounds yet.</Muted>}
              {completed.slice(0, 10).map((r) => (
                <PressableRow key={r.id} onPress={() => router.push(`/rounds/${r.id}`)}>
                  <Body>
                    {r.course?.name ?? r.courseName ?? "Round"} — {new Date(r.startedAt).toLocaleDateString()}
                  </Body>
                </PressableRow>
              ))}
            </Card>
          </View>
        )}
      />
    </Screen>
  );
}
