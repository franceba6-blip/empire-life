import { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Card,
  Label,
  Money,
  PrimaryButton,
  SectionTitle,
} from "@/components/ui";
import { PropertyCard } from "@/components/PropertyCard";
import {
  LOCATIONS,
  PROPERTY_TYPES,
  RENOVATIONS,
} from "@/game/realEstate/config";
import {
  buyProperty,
  mortgageQuote,
  moveIn,
  propertyCashflow,
  renovate,
  renovationQuote,
  rentOut,
  saleQuote,
  sellProperty,
  setManagement,
  vacate,
} from "@/game/realEstate/realEstate";
import { RenovationLevel } from "@/game/realEstate/types";
import { GameState } from "@/models/game";
import { useGameStore } from "@/store/gameStore";
import { formatGameDate } from "@/game/time/time";
import { colors } from "@/theme";
export default function PropertyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    game = useGameStore((s) => s.game),
    update = useGameStore((s) => s.update);
  const [down, setDown] = useState("20"),
    [years, setYears] = useState(25);
  if (!game) return null;
  const p =
    game.realEstate.properties.find((p) => p.id === id) ??
    game.realEstate.listings.find((p) => p.id === id);
  if (!p)
    return (
      <View style={s.content}>
        <Text style={s.title}>Listing no longer available</Text>
        <PrimaryButton
          title="BACK TO ASSETS"
          onPress={() => router.replace("/(tabs)/assets")}
        />
      </View>
    );
  const flow = propertyCashflow(p),
    sale = saleQuote(game, p);
  let quote: ReturnType<typeof mortgageQuote> | undefined,
    reason = "";
  try {
    quote = mortgageQuote(game, p, Number(down), years);
  } catch (e) {
    reason = (e as Error).message;
  }
  const run = (
    title: string,
    detail: string,
    fn: (state: GameState) => GameState,
    back = false,
  ) =>
    Alert.alert(title, detail, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: () => {
          try {
            update(fn);
            if (back) router.replace("/(tabs)/assets");
            else Alert.alert("Completed", title + " recorded in your game.");
          } catch (e) {
            Alert.alert("Action unavailable", (e as Error).message);
          }
        },
      },
    ]);
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <PrimaryButton
        title="‹ REAL ESTATE"
        tone="dark"
        onPress={() => router.replace("/(tabs)/assets")}
      />
      <PropertyCard
        property={p}
        onOpen={() =>
          Alert.alert(
            "Property details",
            `${PROPERTY_TYPES[p.propertyType].label}\n${LOCATIONS.find((l) => l.id === p.locationId)?.name}\n${p.size} m² · ${p.rooms ?? "—"} rooms`,
          )
        }
      />
      <Card style={s.card}>
        <Label>Estimated market value</Label>
        <Money value={p.estimatedMarketValue} />
        <Text style={s.copy}>
          Purchase price €{p.purchasePrice.toLocaleString()} · Condition{" "}
          {p.condition}/100 · Improvement potential {p.renovationPotential}{" "}
          points
        </Text>
        <Text style={s.copy}>
          Potential gross yield{" "}
          {(
            ((p.monthlyRentPotential * 12) / p.estimatedMarketValue) *
            100
          ).toFixed(2)}
          % / year
        </Text>
        <Text style={s.copy}>
          Potential rent €{p.monthlyRentPotential.toLocaleString()}/month ·{" "}
          {(p.maintenanceRate * 100).toFixed(1)}% annual maintenance
        </Text>
      </Card>
      <SectionTitle>Costs & cashflow</SectionTitle>
      <Card style={s.card}>
        {[
          ["Gross rental income", flow.gross],
          ["Operating costs", -flow.operating],
          ["Maintenance", -flow.maintenance],
          ["Manager (12% of rent)", -flow.management],
          ["Mortgage payment", -flow.mortgage],
          ["Net monthly cashflow", flow.net],
        ].map(([name, value]) => (
          <View key={name}>
            <Label>{name}</Label>
            <Money value={value as number} />
          </View>
        ))}
        <Text style={s.copy}>
          30-game-day billing. Vacant and owner-occupied properties earn no
          rent. Rent starts after tenant placement; the first period is
          prorated.
        </Text>
        {p.nextBillingAt && (
          <Text style={s.copy}>
            Next billing: {formatGameDate(p.nextBillingAt)}
          </Text>
        )}
        {p.arrears > 0 && (
          <Text style={s.warning}>
            Unpaid property costs: €{p.arrears.toLocaleString()}
          </Text>
        )}
      </Card>
      {!p.owned ? (
        <>
          <SectionTitle>Purchase</SectionTitle>
          <PrimaryButton
            title={`BUY CASH · €${p.purchasePrice.toLocaleString()}`}
            onPress={() =>
              run(
                "Buy property",
                `Cost €${p.purchasePrice.toLocaleString()}\nTime: 2 hours`,
                (g) => buyProperty(g, p.id),
              )
            }
          />
          <SectionTitle>Mortgage</SectionTitle>
          <Card style={s.card}>
            <Label>Down payment percentage (minimum 20%)</Label>
            <TextInput
              accessibilityLabel="Down payment percentage"
              keyboardType="numeric"
              value={down}
              onChangeText={setDown}
              style={s.input}
            />
            <Label>Term</Label>
            <View style={s.wrap}>
              {[10, 15, 25, 30].map((y) => (
                <PrimaryButton
                  key={y}
                  title={`${y} YEARS`}
                  tone={years === y ? "gold" : "dark"}
                  onPress={() => setYears(y)}
                />
              ))}
            </View>
            {quote ? (
              <>
                <Text style={s.copy}>
                  Down payment €{quote.downPayment.toLocaleString()}{"\n"}Mortgage €
                  {quote.principal.toLocaleString()}{"\n"}APR {quote.apr}% · {years}{" "}
                  years
                </Text>
                <Label>Monthly payment</Label>
                <Money value={quote.monthlyPayment} />
                <Text style={s.copy}>
                  Credit score and existing debt affect this quote.
                </Text>
                <PrimaryButton
                  title="FINANCE PROPERTY"
                  onPress={() =>
                    run(
                      "Finance property",
                      `Down payment €${quote!.downPayment.toLocaleString()}\nDebt €${quote!.principal.toLocaleString()}{"\n"}APR ${quote!.apr}%\nMonthly payment €${quote!.monthlyPayment.toLocaleString()}\nTime: 2 hours`,
                      (g) => buyProperty(g, p.id, true, Number(down), years),
                    )
                  }
                />
              </>
            ) : (
              <Text style={s.warning}>{reason}</Text>
            )}
          </Card>
        </>
      ) : (
        <>
          {p.mortgage && (
            <Card style={s.card}>
              <Label>Mortgage balance</Label>
              <Money value={p.mortgage.remainingBalance} />
              <Text style={s.copy}>
                APR {p.mortgage.apr}% · {p.mortgage.paymentsMade}/
                {p.mortgage.termMonths} scheduled periods · Unpaid interest €
                {p.mortgage.arrears.toLocaleString()}
              </Text>
            </Card>
          )}
          <SectionTitle>Manage property</SectionTitle>
          {p.occupancyState === "VACANT" && !p.renovation && (
            <>
              {PROPERTY_TYPES[p.propertyType].residential && (
                <PrimaryButton
                  title="MOVE IN"
                  onPress={() =>
                    run(
                      "Make this your home",
                      "Cost €0 · Time 8 hours\nYour previous home becomes vacant.",
                      (g) => moveIn(g, p.id),
                    )
                  }
                />
              )}
              {p.propertyType !== "LAND" && (
                <PrimaryButton
                  title="RENT OUT"
                  onPress={() =>
                    run(
                      "Find a tenant",
                      "Cost €0 · Time 7–13 days depending on demand\nProperty bills continue during the search. Rent begins when a tenant moves in.",
                      (g) => rentOut(g, p.id),
                    )
                  }
                />
              )}
            </>
          )}
          {p.occupancyState !== "VACANT" && (
            <PrimaryButton
              title={
                p.occupancyState === "RENTED"
                  ? "END LEASE · 30 DAYS"
                  : "MOVE OUT · 8 HOURS"
              }
              tone="dark"
              onPress={() =>
                run(
                  "Vacate property",
                  "Cost €0. Existing bills continue. Ending a lease advances 30 days; moving out advances 8 hours.",
                  (g) => vacate(g, p.id),
                )
              }
            />
          )}
          <PrimaryButton
            title={
              p.management === "SELF"
                ? "HIRE MANAGER · 12% OF RENT"
                : "SELF MANAGE · NO MANAGEMENT FEE"
            }
            tone="dark"
            onPress={() =>
              run(
                "Change management",
                "Time: 1 hour\nA manager charges 12% of collected rent. Both modes collect scheduled rent automatically in this foundation.",
                (g) =>
                  setManagement(
                    g,
                    p.id,
                    p.management === "SELF" ? "MANAGER" : "SELF",
                  ),
              )
            }
          />
          {p.renovation ? (
            <Card>
              <Label>Renovation in progress</Label>
              <Text style={s.copy}>
                {p.renovation.level} · Ready{" "}
                {formatGameDate(p.renovation.completesAt)}. Advance game time
                through jobs, activities or the test panel.
              </Text>
            </Card>
          ) : (
            p.occupancyState === "VACANT" &&
            p.condition < 100 &&
            p.propertyType !== "LAND" && (
              <>
                <SectionTitle>Renovation</SectionTitle>
                {(Object.keys(RENOVATIONS) as RenovationLevel[]).map(
                  (level) => {
                    const q = renovationQuote(p, level);
                    return (
                      <Card key={level} style={s.card}>
                        <Label>
                          {level} · {q.days} DAYS
                        </Label>
                        <Money value={q.cost} />
                        <Text style={s.copy}>
                          Condition +{q.improvement} · Estimated value +€
                          {q.valueGain.toLocaleString()} · Rent potential +€
                          {q.rentGain.toLocaleString()}/mo
                        </Text>
                        <PrimaryButton
                          title={`START ${level}`}
                          tone="dark"
                          onPress={() =>
                            run(
                              "Start renovation",
                              `Cost €${q.cost.toLocaleString()}\nTime: 1 hour to arrange, ${q.days} days to complete.\nCarrying costs continue. Improvements apply at completion.`,
                              (g) => renovate(g, p.id, level),
                            )
                          }
                        />
                      </Card>
                    );
                  },
                )}
              </>
            )
          )}
          {!p.renovation && (
            <>
              <SectionTitle>Sell property</SectionTitle>
              <Card style={s.card}>
                <Label>Estimated net proceeds after fees & debt</Label>
                <Money value={sale.proceeds} />
                <Text style={s.copy}>
                  Sale €{sale.price.toLocaleString()} · Fees €
                  {sale.fees.toLocaleString()} · Debt settlement €
                  {sale.mortgagePayoff.toLocaleString()}{"\n"}Capital profit/loss €
                  {sale.profit.toLocaleString()} (excludes historical rental
                  cashflow)
                </Text>
                <PrimaryButton
                  title="SELL PROPERTY"
                  tone="danger"
                  onPress={() =>
                    run(
                      "Sell property",
                      `Proceeds €${sale.proceeds.toLocaleString()}\nTime: 1 day\nOwnership and the lease transfer to the buyer.`,
                      (g) => sellProperty(g, p.id),
                      true,
                    )
                  }
                />
              </Card>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: 18,
    paddingTop: 55,
    paddingBottom: 90,
    gap: 14,
    backgroundColor: colors.bg,
  },
  title: { color: colors.text, fontSize: 25 },
  card: { gap: 14 },
  copy: { color: colors.muted, lineHeight: 22 },
  warning: { color: colors.gold, lineHeight: 22 },
  input: {
    color: colors.text,
    backgroundColor: colors.surface2,
    borderRadius: 12,
    padding: 15,
    fontSize: 18,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
