import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import { Body, Button, Card, Chip, H2, Input, Muted, OptionRow, Screen } from "../../src/components/ui";
import { apiFetch, ApiError } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth-context";
import { GameType, MAIN_GAMES, SIDE_GAMES } from "../../src/lib/gameCatalog";
import { colors, spacing } from "../../src/lib/theme";

interface Friend {
  friendshipId: string;
  user: { id: string; displayName: string };
}

interface Course {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
}

export default function NewRoundScreen() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [courseMode, setCourseMode] = useState<"search" | "manual">("manual");
  const [courseQuery, setCourseQuery] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");
  const [holeCount, setHoleCount] = useState<9 | 18>(9);

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [enabledGames, setEnabledGames] = useState<GameType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setSelectedPlayerIds([user.id]);
    apiFetch<{ accepted: Friend[] }>("/api/friends").then((d) => setFriends(d.accepted));
  }, [user]);

  useEffect(() => {
    if (courseMode !== "search") return;
    const t = setTimeout(() => {
      apiFetch<{ courses: Course[] }>(`/api/courses?q=${encodeURIComponent(courseQuery)}`).then((d) =>
        setCourses(d.courses)
      );
    }, 300);
    return () => clearTimeout(t);
  }, [courseQuery, courseMode]);

  function togglePlayer(id: string) {
    if (id === user?.id) return;
    setSelectedPlayerIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  function toggleGame(type: GameType) {
    setEnabledGames((prev) => (prev.includes(type) ? prev.filter((g) => g !== type) : [...prev, type]));
  }

  const needsFourForVegas = enabledGames.includes("VEGAS") && selectedPlayerIds.length !== 4;

  const allPlayers = useMemo(
    () => (user ? [{ id: user.id, displayName: `${user.displayName} (you)` }, ...friends.map((f) => f.user)] : []),
    [user, friends]
  );

  async function onSubmit() {
    setError(null);
    if (needsFourForVegas) {
      setError("Vegas needs exactly 4 players");
      return;
    }
    setSubmitting(true);
    try {
      const gamesConfig: Record<string, unknown> = { playerIds: selectedPlayerIds, enabledGames };
      if (enabledGames.includes("VEGAS")) {
        gamesConfig.vegas = { teamA: selectedPlayerIds.slice(0, 2), teamB: selectedPlayerIds.slice(2, 4) };
      }
      if (enabledGames.includes("WOLF")) gamesConfig.wolf = { order: selectedPlayerIds };
      if (enabledGames.includes("BANKER")) gamesConfig.banker = { rotation: selectedPlayerIds };
      if (enabledGames.includes("SKINS")) gamesConfig.skins = { carryover: true };
      if (enabledGames.includes("VAULT")) gamesConfig.vault = {};
      if (enabledGames.includes("CHAOS")) gamesConfig.chaos = { seed: Date.now() % 100000 };

      const payload =
        courseMode === "search" && selectedCourseId
          ? { courseId: selectedCourseId, gamesConfig }
          : { courseName: manualName || "Round", holePars: Array(holeCount).fill(4), gamesConfig };

      const { round } = await apiFetch<{ round: { id: string } }>("/api/rounds", { json: payload });
      router.replace(`/rounds/${round.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start the round");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <FlatList
        data={[1]}
        keyExtractor={() => "content"}
        contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.sm }}
        renderItem={() => (
          <View style={{ gap: spacing.lg }}>
            <Card>
              <H2 style={{ marginBottom: spacing.sm }}>Course</H2>
              <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm }}>
                <Button
                  title="Search"
                  variant={courseMode === "search" ? "primary" : "secondary"}
                  onPress={() => setCourseMode("search")}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Manual"
                  variant={courseMode === "manual" ? "primary" : "secondary"}
                  onPress={() => setCourseMode("manual")}
                  style={{ flex: 1 }}
                />
              </View>
              {courseMode === "search" ? (
                <View style={{ gap: spacing.sm }}>
                  <Input placeholder="Search courses…" value={courseQuery} onChangeText={setCourseQuery} />
                  {courses.map((c) => (
                    <Chip
                      key={c.id}
                      label={`${c.name}${c.city ? ` — ${c.city}` : ""}`}
                      active={selectedCourseId === c.id}
                      onPress={() => setSelectedCourseId(c.id)}
                    />
                  ))}
                  {courses.length === 0 && <Muted>No matches yet — try Manual.</Muted>}
                </View>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  <Input placeholder="Course name" value={manualName} onChangeText={setManualName} />
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <Button title="9 holes" variant={holeCount === 9 ? "primary" : "secondary"} onPress={() => setHoleCount(9)} style={{ flex: 1 }} />
                    <Button title="18 holes" variant={holeCount === 18 ? "primary" : "secondary"} onPress={() => setHoleCount(18)} style={{ flex: 1 }} />
                  </View>
                </View>
              )}
            </Card>

            <Card>
              <H2 style={{ marginBottom: spacing.sm }}>Players</H2>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                {allPlayers.map((p) => (
                  <Chip
                    key={p.id}
                    label={p.displayName}
                    active={selectedPlayerIds.includes(p.id)}
                    onPress={() => togglePlayer(p.id)}
                  />
                ))}
              </View>
              {friends.length === 0 && <Muted style={{ marginTop: spacing.sm }}>Playing solo works too.</Muted>}
            </Card>

            <Card>
              <H2>Main game</H2>
              <Muted style={{ marginBottom: spacing.md }}>Stroke Play is always tracked automatically.</Muted>
              <View style={{ gap: spacing.sm }}>
                {MAIN_GAMES.map((g) => (
                  <OptionRow
                    key={g.type}
                    label={g.label}
                    hint={g.hint}
                    active={enabledGames.includes(g.type)}
                    onPress={() => toggleGame(g.type)}
                  />
                ))}
              </View>
              {needsFourForVegas && <Body style={{ color: "#facc15", marginTop: spacing.sm }}>Vegas needs exactly 4 players.</Body>}
            </Card>

            <Card>
              <H2 style={{ marginBottom: spacing.sm }}>Side bets</H2>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                {SIDE_GAMES.map((g) => (
                  <Chip
                    key={g.type}
                    label={g.label}
                    color="accent2"
                    active={enabledGames.includes(g.type)}
                    onPress={() => toggleGame(g.type)}
                  />
                ))}
              </View>
            </Card>

            {error && <Body style={{ color: "#ff6b6b" }}>{error}</Body>}
            <Button title={submitting ? "Starting…" : "Start round"} onPress={onSubmit} loading={submitting} />
          </View>
        )}
      />
    </Screen>
  );
}
