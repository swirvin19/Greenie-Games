import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { Body, Button, Card, Chip, GlowText, H1, H2, Input, Muted, Screen } from "../../src/components/ui";
import { apiFetch, ApiError } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth-context";
import { GamesConfig, HoleEntry, RoundResults, gameMeta } from "../../src/lib/gameCatalog";
import { colors, spacing } from "../../src/lib/theme";
import { ThreadPanel } from "../../src/components/ThreadPanel";

interface RoundDetail {
  id: string;
  ownerId: string;
  status: "IN_PROGRESS" | "COMPLETED";
  gamesConfig: GamesConfig;
  scoreData: HoleEntry[];
  courseName: string | null;
  course: { name: string } | null;
  owner: { id: string; displayName: string };
  followers: { userId: string }[];
  thread: { id: string } | null;
}

interface Player {
  id: string;
  displayName: string;
}

interface Wager {
  id: string;
  targetUserId: string;
  description: string;
  status: string;
  bettor: { displayName: string };
  target: { displayName: string };
}

export default function RoundDetailScreen() {
  const { user } = useAuth();
  const { id: roundId } = useLocalSearchParams<{ id: string }>();
  const [round, setRound] = useState<RoundDetail | null>(null);
  const [results, setResults] = useState<RoundResults | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [wagers, setWagers] = useState<Wager[]>([]);
  const [holeIndex, setHoleIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await apiFetch<{ round: RoundDetail; results: RoundResults; players: Player[] }>(
      `/api/rounds/${roundId}`
    );
    setRound(data.round);
    setResults(data.results);
    setPlayers(data.players);
    apiFetch<{ wagers: Wager[] }>(`/api/rounds/${roundId}/wagers`).then((d) => setWagers(d.wagers));
  }, [roundId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!round || !results) {
    return (
      <Screen>
        <Muted>Loading…</Muted>
      </Screen>
    );
  }

  const isOwner = round.ownerId === user?.id;
  const isFollowing = round.followers.some((f) => f.userId === user?.id);
  const canEdit = round.status === "IN_PROGRESS" && (isOwner || round.gamesConfig.playerIds.includes(user?.id ?? ""));
  const nameFor = (pid: string) => players.find((p) => p.id === pid)?.displayName ?? pid;
  const hole = round.scoreData[holeIndex];
  const mainGameResults = results.games.filter((g) => gameMeta(g.game)?.group === "main");
  const sideGameResults = results.games.filter((g) => gameMeta(g.game)?.group === "side");

  async function setStrokes(playerId: string, value: string) {
    const strokes = value === "" ? null : Number(value);
    if (value !== "" && Number.isNaN(strokes as number)) return;
    try {
      const data = await apiFetch<{ round: RoundDetail; results: RoundResults }>(`/api/rounds/${roundId}`, {
        method: "PATCH",
        json: { holeNumber: hole.holeNumber, strokes: { [playerId]: strokes } },
      });
      setRound(data.round);
      setResults(data.results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save score");
    }
  }

  async function setMarker(field: "greenieWinner" | "bombWinner", playerId: string) {
    const current = hole[field];
    const next = current === playerId ? null : playerId;
    const data = await apiFetch<{ round: RoundDetail; results: RoundResults }>(`/api/rounds/${roundId}`, {
      method: "PATCH",
      json: { holeNumber: hole.holeNumber, [field]: next },
    });
    setRound(data.round);
    setResults(data.results);
  }

  async function completeRound() {
    try {
      await apiFetch(`/api/rounds/${roundId}/complete`, { method: "POST", json: {} });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't complete round");
    }
  }

  async function toggleFollow() {
    await apiFetch(`/api/rounds/${roundId}/follow`, { json: { follow: !isFollowing } });
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
            <View>
              <H1>{round.course?.name ?? round.courseName ?? "Round"}</H1>
              <Muted>
                Hosted by {round.owner.displayName} · {round.status === "IN_PROGRESS" ? "Live" : "Completed"}
              </Muted>
            </View>

            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              {!isOwner && (
                <Button title={isFollowing ? "Following" : "Follow"} variant="secondary" onPress={toggleFollow} style={{ flex: 1 }} />
              )}
              {isOwner && round.status === "IN_PROGRESS" && (
                <Button title="Finish round" onPress={completeRound} style={{ flex: 1 }} />
              )}
            </View>

            {error && <Body style={{ color: "#ff6b6b" }}>{error}</Body>}

            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md }}>
                <Pressable onPress={() => setHoleIndex((i) => Math.max(0, i - 1))} disabled={holeIndex === 0}>
                  <Ionicons name="chevron-back" size={24} color={holeIndex === 0 ? colors.border : colors.accent} />
                </Pressable>
                <View style={{ alignItems: "center" }}>
                  <H2>Hole {hole.holeNumber}</H2>
                  <Muted>Par {hole.par}</Muted>
                </View>
                <Pressable
                  onPress={() => setHoleIndex((i) => Math.min(round.scoreData.length - 1, i + 1))}
                  disabled={holeIndex === round.scoreData.length - 1}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={holeIndex === round.scoreData.length - 1 ? colors.border : colors.accent}
                  />
                </Pressable>
              </View>

              <View style={{ gap: spacing.sm }}>
                {round.gamesConfig.playerIds.map((pid) => (
                  <View key={pid} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <Body style={{ flex: 1 }}>{nameFor(pid)}</Body>
                    <Input
                      keyboardType="number-pad"
                      value={hole.strokes[pid] != null ? String(hole.strokes[pid]) : ""}
                      onChangeText={(v) => setStrokes(pid, v)}
                      editable={canEdit}
                      style={{ width: 56, textAlign: "center" }}
                    />
                    {hole.par === 3 ? (
                      <MarkerButton active={hole.greenieWinner === pid} label="G" color="accent" disabled={!canEdit} onPress={() => setMarker("greenieWinner", pid)} />
                    ) : (
                      <MarkerButton active={hole.bombWinner === pid} label="B" color="accent2" disabled={!canEdit} onPress={() => setMarker("bombWinner", pid)} />
                    )}
                  </View>
                ))}
              </View>
              <Muted style={{ marginTop: spacing.sm }}>
                G = closest-to-pin (Greenie) · B = longest drive (Bomb)
              </Muted>
            </Card>

            <ResultCard title="Stroke Play" main>
              {results.leaderboard
                .slice()
                .sort((a, b) => (a.totalStrokes || 999) - (b.totalStrokes || 999))
                .map((row) => (
                  <ResultRow
                    key={row.playerId}
                    name={nameFor(row.playerId)}
                    value={`${row.totalStrokes} (${row.holesPlayed}h)${row.toPar !== null ? ` ${row.toPar > 0 ? "+" + row.toPar : row.toPar}` : ""}`}
                  />
                ))}
            </ResultCard>

            {mainGameResults.map((g) => (
              <ResultCard key={g.game} title={g.label} main>
                {g.standings
                  .slice()
                  .sort((a, b) => b.value - a.value)
                  .map((s, i) => (
                    <ResultRow key={`${s.playerId}-${i}`} name={nameFor(s.playerId)} value={`${s.value}${s.note ? ` — ${s.note}` : ""}`} />
                  ))}
              </ResultCard>
            ))}

            {sideGameResults.length > 0 && (
              <Card>
                <GlowText style={{ fontWeight: "700", marginBottom: spacing.sm }}>Side bets</GlowText>
                {sideGameResults.map((g) => (
                  <View key={g.game} style={{ marginBottom: spacing.sm }}>
                    <Body style={{ color: colors.accent2, fontWeight: "600" }}>{g.label}</Body>
                    {g.standings
                      .slice()
                      .sort((a, b) => b.value - a.value)
                      .map((s, i) => (
                        <ResultRow key={`${s.playerId}-${i}`} name={nameFor(s.playerId)} value={`${s.value}${s.note ? ` — ${s.note}` : ""}`} />
                      ))}
                  </View>
                ))}
              </Card>
            )}

            <WagerCard roundId={roundId} players={players} wagers={wagers} onChange={load} />

            {round.thread && <ThreadPanel threadId={round.thread.id} title="Round chat" />}
          </View>
        )}
      />
    </Screen>
  );
}

function MarkerButton({ active, label, color, disabled, onPress }: { active: boolean; label: string; color: "accent" | "accent2"; disabled: boolean; onPress: () => void }) {
  const c = color === "accent" ? colors.accent : colors.accent2;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? c : "rgba(255,255,255,0.05)",
      }}
    >
      <Body style={{ color: active ? (color === "accent" ? colors.accentInk : "#fff") : colors.muted, fontWeight: "700" }}>{label}</Body>
    </Pressable>
  );
}

function ResultCard({ title, main, children }: { title: string; main?: boolean; children: React.ReactNode }) {
  return (
    <Card style={main ? { borderColor: colors.accent + "4d" } : undefined}>
      <GlowText style={{ fontWeight: "700", marginBottom: spacing.sm }}>{title}</GlowText>
      {children}
    </Card>
  );
}

function ResultRow({ name, value }: { name: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
      <Body>{name}</Body>
      <Body>{value}</Body>
    </View>
  );
}

function WagerCard({
  roundId,
  players,
  wagers,
  onChange,
}: {
  roundId: string;
  players: Player[];
  wagers: Wager[];
  onChange: () => void;
}) {
  const [targetUserId, setTargetUserId] = useState(players[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetUserId && players.length > 0) setTargetUserId(players[0].id);
  }, [players, targetUserId]);

  async function placeWager() {
    setError(null);
    try {
      await apiFetch(`/api/rounds/${roundId}/wagers`, { json: { targetUserId, description } });
      setDescription("");
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't place wager");
    }
  }

  async function settle(id: string, status: "SETTLED_WIN" | "SETTLED_LOSS" | "VOID") {
    await apiFetch(`/api/wagers/${id}`, { method: "PATCH", json: { status } });
    onChange();
  }

  return (
    <Card>
      <GlowText style={{ fontWeight: "700" }}>Remote wagers</GlowText>
      <Muted style={{ marginBottom: spacing.sm }}>Informal, no money changes hands here.</Muted>
      {wagers.map((w) => (
        <View key={w.id} style={{ marginBottom: spacing.sm }}>
          <Body>
            {w.bettor.displayName} on {w.target.displayName}: {w.description} ({w.status})
          </Body>
          {w.status === "OPEN" && (
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs }}>
              <Button title="Win" variant="secondary" onPress={() => settle(w.id, "SETTLED_WIN")} />
              <Button title="Loss" variant="secondary" onPress={() => settle(w.id, "SETTLED_LOSS")} />
              <Button title="Void" variant="secondary" onPress={() => settle(w.id, "VOID")} />
            </View>
          )}
        </View>
      ))}
      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        <Muted>Betting on:</Muted>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {players.map((p) => (
            <Chip key={p.id} label={p.displayName} active={targetUserId === p.id} onPress={() => setTargetUserId(p.id)} />
          ))}
        </View>
        <Input placeholder="Dale won't break 85 — $20" value={description} onChangeText={setDescription} />
        {error && <Body style={{ color: "#ff6b6b" }}>{error}</Body>}
        <Button title="Place" onPress={placeWager} disabled={!description || !targetUserId} />
      </View>
    </Card>
  );
}
