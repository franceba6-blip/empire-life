import { ScrollView, Text, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import { useGameStore } from "@/store/gameStore";
import {
  Card,
  Label,
  Money,
  PrimaryButton,
  SectionTitle,
} from "@/components/ui";
import { PropertyCard } from "@/components/PropertyCard";
import { portfolio } from "@/game/realEstate/realEstate";
import { colors } from "@/theme";
export default function Assets() {
  const game = useGameStore((s) => s.game);
  const [owned, setOwned] = useState(false);
  if (!game) return null;
  const totals = portfolio(game);
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.kicker}>
        ASSETS / REAL ESTATE {game.mode === "TEST" ? "· TEST SAVE" : ""}
      </Text>
      <Text style={s.title}>Build your address.</Text>
      <Text style={s.copy}>Homes to live in. Assets to grow with.</Text>
      <Card style={{ gap: 12 }}>
        <Label>Cash available</Label>
        <Money value={game.cash} />
        <Label>
          {game.realEstate.market} MARKET · refreshed each game month
        </Label>
      </Card>
      <View style={s.row}>
        <View style={s.half}>
          <PrimaryButton
            title="MARKET"
            tone={owned ? "dark" : "gold"}
            onPress={() => setOwned(false)}
          />
        </View>
        <View style={s.half}>
          <PrimaryButton
            title="MY PROPERTIES"
            tone={owned ? "gold" : "dark"}
            onPress={() => setOwned(true)}
          />
        </View>
      </View>
      {owned && (
        <>
          <SectionTitle>Portfolio · {totals.count} properties</SectionTitle>
          <Card style={{ gap: 15 }}>
            {[
              ["Market value", totals.value],
              ["Debt & arrears", totals.debt],
              ["Equity", totals.equity],
              ["Monthly gross rent", totals.gross],
              ["Monthly net cashflow", totals.net],
            ].map(([label, value]) => (
              <View key={label}>
                <Label>{label}</Label>
                <Money value={value as number} />
              </View>
            ))}
          </Card>
          <Text style={s.copy}>
            Forecast per 30-game-day billing cycle. First rent is prorated.
            Vacant homes still incur costs.
          </Text>
        </>
      )}
      <SectionTitle>
        {owned ? "Your properties" : "Discover properties"}
      </SectionTitle>
      {(owned ? game.realEstate.properties : game.realEstate.listings).map(
        (p) => (
          <PropertyCard
            key={p.id}
            property={p}
            onOpen={() =>
              router.push({ pathname: "/property/[id]", params: { id: p.id } })
            }
          />
        ),
      )}
      {owned && !totals.count && (
        <Card>
          <Text style={s.copy}>
            Your first property starts here. Explore the market or open
            Developer Test Mode to try every tier.
          </Text>
        </Card>
      )}
      {owned && game.realEstate.sales.length > 0 && (
        <>
          <SectionTitle>Completed sales</SectionTitle>
          {game.realEstate.sales.map((sale) => (
            <Card key={sale.id}>
              <Label>Sale profit / loss · after fees and renovation</Label>
              <Money value={sale.profit} />
              <Text style={s.copy}>
                Sold for €{sale.price.toLocaleString()}
              </Text>
            </Card>
          ))}
        </>
      )}
      <PrimaryButton
        title="DEVELOPER / TEST MODE"
        tone="dark"
        onPress={() => router.push("/developer")}
      />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18, paddingTop: 60, paddingBottom: 100, gap: 14 },
  kicker: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: { color: colors.text, fontSize: 32, fontWeight: "900" },
  copy: { color: colors.muted, lineHeight: 21 },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
});
