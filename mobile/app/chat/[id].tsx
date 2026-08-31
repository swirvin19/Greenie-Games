import { useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native";
import { ThreadPanel } from "../../src/components/ThreadPanel";
import { Screen } from "../../src/components/ui";
import { spacing } from "../../src/lib/theme";

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.xxl }}>
        <ThreadPanel threadId={id} />
      </ScrollView>
    </Screen>
  );
}
