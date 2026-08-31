import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radii, spacing } from "../lib/theme";

export function Screen({ children, style, ...props }: ViewProps) {
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={[styles.screenInner, style]} {...props}>
        {children}
      </View>
    </SafeAreaView>
  );
}

// Text with `onPress` doesn't reliably receive pointer events on web (RN
// Web quirk — the parent View can end up as the elementFromPoint hit
// instead of the Text leaf). Anything tappable needs a real Pressable
// wrapper, not a Text/onPress shortcut — this is that wrapper for a plain
// tappable row of text.
export function PressableRow({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: ViewProps["style"];
}) {
  return (
    <Pressable onPress={onPress} style={[{ paddingVertical: spacing.xs }, style]}>
      {children}
    </Pressable>
  );
}

export function Card({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

export function H1({ children, style, ...props }: TextProps) {
  return (
    <Text style={[styles.h1, style]} {...props}>
      {children}
    </Text>
  );
}

export function H2({ children, style, ...props }: TextProps) {
  return (
    <Text style={[styles.h2, style]} {...props}>
      {children}
    </Text>
  );
}

export function Muted({ children, style, ...props }: TextProps) {
  return (
    <Text style={[styles.muted, style]} {...props}>
      {children}
    </Text>
  );
}

export function GlowText({ children, style, ...props }: TextProps) {
  return (
    <Text style={[styles.glow, style]} {...props}>
      {children}
    </Text>
  );
}

export function Body({ children, style, ...props }: TextProps) {
  return (
    <Text style={[styles.body, style]} {...props}>
      {children}
    </Text>
  );
}

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "purple";
  style?: ViewProps["style"];
}

export function Button({ title, onPress, disabled, loading, variant = "primary", style }: ButtonProps) {
  const variantStyle =
    variant === "primary" ? styles.btnPrimary : variant === "purple" ? styles.btnPurple : styles.btnSecondary;
  const textStyle =
    variant === "primary" ? styles.btnPrimaryText : variant === "purple" ? styles.btnPurpleText : styles.btnSecondaryText;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [variantStyle, style, (disabled || loading) && styles.btnDisabled, pressed && styles.btnPressed]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? colors.foreground : colors.accentInk} />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} style={[styles.input, props.style]} {...props} />;
}

export function OptionRow({
  label,
  hint,
  active,
  onPress,
  color = "accent",
}: {
  label: string;
  hint: string;
  active: boolean;
  onPress: () => void;
  color?: "accent" | "accent2";
}) {
  const activeColor = color === "accent" ? colors.accent : colors.accent2;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.optionRow, active && { borderColor: activeColor, backgroundColor: activeColor + "1a" }]}
    >
      <Text style={[styles.body, { fontWeight: "600" }, active && { color: activeColor }]}>{label}</Text>
      <Text style={styles.muted}>{hint}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color = "accent",
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  color?: "accent" | "accent2";
}) {
  const activeColor = color === "accent" ? colors.accent : colors.accent2;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && { borderColor: activeColor, backgroundColor: activeColor + "26" },
      ]}
    >
      <Text style={[styles.chipText, active && { color: activeColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenInner: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  h1: { fontSize: 26, fontWeight: "800", color: colors.foreground },
  h2: { fontSize: 17, fontWeight: "700", color: colors.foreground },
  body: { fontSize: 15, color: colors.foreground },
  muted: { fontSize: 13, color: colors.muted },
  glow: { color: colors.accentBright },
  input: {
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.foreground,
    fontSize: 15,
  },
  btnPrimary: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { color: colors.accentInk, fontWeight: "800", fontSize: 15 },
  btnSecondary: {
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: { color: colors.foreground, fontWeight: "600", fontSize: 15 },
  btnPurple: {
    backgroundColor: colors.accent2,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPurpleText: { color: "#ffffff", fontWeight: "800", fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.85 },
  optionRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 2,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipText: { color: colors.foreground, fontWeight: "600", fontSize: 13 },
});
