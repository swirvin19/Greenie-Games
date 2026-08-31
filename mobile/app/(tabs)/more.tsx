import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { Body, Card, H1, Muted, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/lib/auth-context";
import { colors, spacing } from "../../src/lib/theme";

const links = [
  { href: "/trade", label: "Trade", icon: "swap-horizontal" as const },
  { href: "/inventory", label: "Inventory", icon: "shirt" as const },
  { href: "/season-pass", label: "Season Pass", icon: "ribbon" as const },
  { href: "/profile", label: "Profile", icon: "person-circle" as const },
];

export default function MoreScreen() {
  const { user, logout } = useAuth();

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <H1>More</H1>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {links.map((l, i) => (
            <Pressable
              key={l.href}
              onPress={() => router.push(l.href as never)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.md,
                padding: spacing.lg,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <Ionicons name={l.icon} size={20} color={colors.accent} />
              <Body style={{ flex: 1 }}>{l.label}</Body>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </Card>

        <Card>
          <Body style={{ fontWeight: "600" }}>{user?.displayName}</Body>
          <Muted>{user?.email}</Muted>
        </Card>

        <Pressable
          onPress={() => {
            logout();
            router.replace("/login");
          }}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            padding: spacing.md,
            alignItems: "center",
          }}
        >
          <Body style={{ color: "#ff6b6b", fontWeight: "600" }}>Log out</Body>
        </Pressable>
      </View>
    </Screen>
  );
}
