import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { Body, Card, GlowText, H1, H2, Muted, PressableRow, Screen } from "../../src/components/ui";
import { apiFetch } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth-context";
import { spacing } from "../../src/lib/theme";

interface RoundSummary {
  id: string;
  status: "IN_PROGRESS" | "COMPLETED";
  courseName: string | null;
  course: { name: string } | null;
  owner: { id: string; displayName: string };
  startedAt: string;
}

interface ProgressResponse {
  counters: {
    roundsCompleted: number;
    holesLogged: number;
    distinctFriendsPlayedWith: number;
    invitesConverted: number;
  };
  passes: { id: string; name: string }[];
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<{ mine: RoundSummary[]; friendsLive: RoundSummary[] } | null>(null);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [r, p] = await Promise.all([
      apiFetch<{ mine: RoundSummary[]; friendsLive: RoundSummary[] }>("/api/rounds"),
      apiFetch<ProgressResponse>("/api/progress"),
    ]);
    setRounds(r);
    setProgress(p);
  }, []);

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

  return (
    <Screen>
      <FlatList
        data={[1]}
        keyExtractor={() => "content"}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#cfe600" />}
        contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxl }}
        renderItem={() => (
          <View style={{ gap: spacing.lg }}>
            <H1>Hey {user?.displayName} 👋</H1>

            {inProgress.length > 0 && (
              <Card>
                <GlowText style={{ fontWeight: "700", marginBottom: spacing.sm }}>Your round in progress</GlowText>
                {inProgress.map((r) => (
                  <PressableRow key={r.id} onPress={() => router.push(`/rounds/${r.id}`)}>
                    <Body>{r.course?.name ?? r.courseName ?? "Round"}</Body>
                  </PressableRow>
                ))}
              </Card>
            )}

            {progress && (
              <Card>
                <H2 style={{ marginBottom: spacing.md }}>Your progress</H2>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  <Stat label="Rounds" value={progress.counters.roundsCompleted} />
                  <Stat label="Holes logged" value={progress.counters.holesLogged} />
                  <Stat label="Friends played with" value={progress.counters.distinctFriendsPlayedWith} />
                  <Stat label="Invites converted" value={progress.counters.invitesConverted} />
                </View>
                {progress.passes.length > 0 && (
                  <PressableRow onPress={() => router.push("/season-pass")} style={{ paddingVertical: 0, marginTop: spacing.md }}>
                    <Body style={{ color: "#cfe600" }}>View {progress.passes[0].name} rewards →</Body>
                  </PressableRow>
                )}
              </Card>
            )}

            <Card>
              <H2 style={{ marginBottom: spacing.sm }}>Friends playing right now</H2>
              {rounds && rounds.friendsLive.length === 0 && <Muted>Nobody's live right now.</Muted>}
              {rounds?.friendsLive.map((r) => (
                <PressableRow key={r.id} onPress={() => router.push(`/rounds/${r.id}`)}>
                  <Body>
                    {r.owner.displayName} at {r.course?.name ?? r.courseName ?? "a course"}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View
      style={{
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 10,
        padding: spacing.md,
        minWidth: 100,
        flexGrow: 1,
        alignItems: "center",
      }}
    >
      <GlowText style={{ fontSize: 20, fontWeight: "800" }}>{value}</GlowText>
      <Muted>{label}</Muted>
    </View>
  );
}
