import { useEffect } from "react";
import { Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useGameStore } from "@/store/gameStore";

export default function RootLayout() {
  const test = useGameStore((s) => s.game?.mode === "TEST");
  const hydrate = useGameStore((s) => s.hydrate);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  return (
    <>
      <StatusBar style="light" />
      {test && (
        <Pressable
          accessibilityLabel="Open developer test mode"
          onPress={() => router.push("/developer")}
          style={{
            backgroundColor: "#473817",
            paddingTop: 48,
            paddingBottom: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#F4D791", fontWeight: "900" }}>
            DEBUG · TEST SAVE · TAP TO SWITCH
          </Text>
        </Pressable>
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#080B12" },
        }}
      />
    </>
  );
}
