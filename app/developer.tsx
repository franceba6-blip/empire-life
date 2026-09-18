import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import {
  Card,
  Label,
  Money,
  PrimaryButton,
  SectionTitle,
} from "@/components/ui";
import { debugCash } from "@/game/economy/economy";
import { advanceGameTime, formatGameTime } from "@/game/time/time";
import { useGameStore } from "@/store/gameStore";
import { colors } from "@/theme";
export default function Developer() {
  const game = useGameStore((s) => s.game),
    update = useGameStore((s) => s.update),
    switchMode = useGameStore((s) => s.switchMode);
  const [busy, setBusy] = useState(false);
  if (!game) return null;
  const switchSave = async () => {
    setBusy(true);
    try {
      await switchMode(game.mode === "TEST" ? "NORMAL" : "TEST");
    } catch (e) {
      Alert.alert("Save error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const change = (amount: number, set = false) => {
    try {
      update((g) => debugCash(g, amount, set ? "SET" : "ADD"));
    } catch (e) {
      Alert.alert("Debug action failed", (e as Error).message);
    }
  };
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <PrimaryButton
        title="‹ ASSETS"
        tone="dark"
        onPress={() => router.replace("/(tabs)/assets")}
      />
      <Text style={s.kicker}>DEBUG · DEVELOPER / TEST MODE</Text>
      <Text style={s.title}>Your testing sandbox.</Text>
      <Text style={s.copy}>
        The test save is separate from normal progress. First entry copies your
        current game; later entries resume that test save. Money tools are
        disabled in normal play. App restart opens the normal save.
      </Text>
      <Card style={{ gap: 12 }}>
        <Label>
          {game.mode === "TEST"
            ? "ISOLATED TEST SAVE"
            : "NORMAL SAVE — DEBUG ACTIONS DISABLED"}
        </Label>
        <Money value={game.cash} />
        <Text style={s.copy}>{formatGameTime(game)}</Text>
        <PrimaryButton
          disabled={busy}
          title={
            game.mode === "TEST"
              ? "RETURN TO NORMAL SAVE"
              : "ENTER SEPARATE TEST SAVE"
          }
          onPress={() => void switchSave()}
        />
      </Card>
      {game.mode === "TEST" && (
        <>
          <SectionTitle>Test money</SectionTitle>
          {[10000, 1000000, 1000000000].map((amount) => (
            <PrimaryButton
              key={amount}
              title={`+ €${amount.toLocaleString()}`}
              disabled={busy}
              onPress={() => change(amount)}
            />
          ))}
          <PrimaryButton
            title="SET CASH TO €1,000,000,000"
            disabled={busy}
            onPress={() => change(1000000000, true)}
          />
          <Text style={s.copy}>
            Each adjustment is recorded as DEBUG_TRANSACTION and excluded from
            earned income.
          </Text>
          <SectionTitle>Advance game time</SectionTitle>
          {[1, 30, 365].map((days) => (
            <PrimaryButton
              key={days}
              title={`ADVANCE ${days === 365 ? "1 YEAR (365 DAYS)" : `${days} DAY${days > 1 ? "S" : ""}`}`}
              tone="dark"
              disabled={busy}
              onPress={() => {
                try {
                  update((g) => advanceGameTime(g, days * 24));
                } catch (e) {
                  Alert.alert("Time advance failed", (e as Error).message);
                }
              }}
            />
          ))}
          <Text style={s.copy}>
            Time tools process real rent, expenses, mortgages, renovations and
            family events. They affect this test save only.
          </Text>
          <SectionTitle>Recent debug transactions</SectionTitle>
          {game.transactions
            .filter((t) => t.type === "DEBUG_TRANSACTION")
            .slice(0, 5)
            .map((t) => (
              <Card key={t.id}>
                <Label>{t.description}</Label>
                <Money value={t.direction === "DEBIT" ? -t.amount : t.amount} />
              </Card>
            ))}
        </>
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18, paddingTop: 55, paddingBottom: 90, gap: 15 },
  kicker: { color: colors.gold, fontWeight: "900", letterSpacing: 1 },
  title: { color: colors.text, fontSize: 30, fontWeight: "900" },
  copy: { color: colors.muted, lineHeight: 22 },
});
