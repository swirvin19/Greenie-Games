import { Link, router } from "expo-router";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, View } from "react-native";
import { Body, Button, GlowText, H1, Input, Muted, Screen } from "../src/components/ui";
import { useAuth } from "../src/lib/auth-context";
import { ApiError } from "../src/lib/api";
import { spacing } from "../src/lib/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/(tabs)/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center" }}>
        <View style={{ alignItems: "center", gap: spacing.sm, marginBottom: spacing.xl }}>
          <Image
            source={require("../assets/greeni-mascot.png")}
            style={{ width: 90, height: 73 }}
            resizeMode="contain"
          />
          <Muted style={{ textTransform: "uppercase", letterSpacing: 2 }}>Greeni Games</Muted>
          <H1>
            Welcome <GlowText>back</GlowText>
          </H1>
        </View>

        <View style={{ gap: spacing.md }}>
          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
          {error && <Body style={{ color: "#ff6b6b" }}>{error}</Body>}
          <Button title={submitting ? "Logging in…" : "Log in"} onPress={onSubmit} loading={submitting} />
        </View>

        <View style={{ marginTop: spacing.lg, alignItems: "center", gap: spacing.xs }}>
          <Link href="/signup" asChild>
            <Body>
              No account? <GlowText>Sign up</GlowText>
            </Body>
          </Link>
          <Muted style={{ textAlign: "center", marginTop: spacing.sm }}>
            Demo: jon@example.com / dale@example.com / mia@example.com — password{"\n"}"password123"
          </Muted>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
