import { Link, router } from "expo-router";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, View } from "react-native";
import { Body, Button, GlowText, H1, Input, Screen } from "../src/components/ui";
import { useAuth } from "../src/lib/auth-context";
import { ApiError } from "../src/lib/api";
import { spacing } from "../src/lib/theme";

export default function SignupScreen() {
  const { signup } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signup(displayName, email, password);
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
          <H1>
            Join <GlowText>Greeni Games</GlowText>
          </H1>
        </View>

        <View style={{ gap: spacing.md }}>
          <Input placeholder="Display name" value={displayName} onChangeText={setDisplayName} />
          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input
            placeholder="Password (8+ characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {error && <Body style={{ color: "#ff6b6b" }}>{error}</Body>}
          <Button title={submitting ? "Creating…" : "Create account"} onPress={onSubmit} loading={submitting} />
        </View>

        <View style={{ marginTop: spacing.lg, alignItems: "center" }}>
          <Link href="/login" asChild>
            <Body>
              Already have an account? <GlowText>Log in</GlowText>
            </Body>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
