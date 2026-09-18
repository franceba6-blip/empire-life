import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, type Href } from "expo-router";
import { Card, Label, Money, PrimaryButton, SectionTitle } from "@/components/ui";
import { MARKET_OFFERS } from "@/config/balance";
import { buyItem, listItem } from "@/game/businesses/reselling";
import { businessValue } from "@/game/economy/economy";
import type { InventoryItem } from "@/models/game";
import { useGameStore } from "@/store/gameStore";
import { colors, spacing } from "@/theme";

function InventoryRow({ item }: { item: InventoryItem }) {
  const update = useGameStore((state) => state.update);
  const [price, setPrice] = useState(String(item.marketValue));
  return <Card style={s.card}><View style={s.between}><View><Text style={s.item}>{item.name}</Text><Text style={s.meta}>Paid €{item.purchasePrice} · Value €{item.marketValue}</Text></View><Text style={s.demand}>{item.demand}</Text></View>{item.listedPrice ? <Text style={s.listed}>Listed for €{item.listedPrice}</Text> : <View style={s.listRow}><TextInput accessibilityLabel={`Listing price for ${item.name}`} value={price} onChangeText={setPrice} keyboardType="numeric" style={s.input} /><View style={{ flex: 1 }}><PrimaryButton title="LIST" onPress={() => { try { update((game) => listItem(game, item.id, Number(price))); } catch (error) { Alert.alert("Invalid price", (error as Error).message); } }} /></View></View>}</Card>;
}

export default function Business() {
  const game = useGameStore((state) => state.game)!;
  const update = useGameStore((state) => state.update);
  const business = game.businesses[0];
  const grossProfit = business.revenue - business.productCosts;
  const netProfit = grossProfit - business.salaryExpenses - business.otherExpenses;
  return <ScrollView style={s.root} contentContainerStyle={s.content}>
    <Text style={s.kicker}>MY BUSINESSES</Text><Text style={s.title}>Reselling</Text>
    <Card style={s.summary}><View><Label>Business value</Label><Money value={businessValue(game)} /></View><View><Label>Net profit</Label><Money value={netProfit} /></View><View><Label>Staff</Label><Text style={s.metric}>{game.staff.employees.length}</Text></View><View><Label>Automation</Label><Text style={s.metric}>{business.management.automationEfficiency}%</Text></View></Card>
    <View style={s.actions}><View style={s.action}><PrimaryButton title="STAFF" onPress={() => router.push("/staff" as Href)} /></View><View style={s.action}><PrimaryButton title="MANAGEMENT" tone="dark" onPress={() => router.push("/management" as Href)} /></View></View>
    <SectionTitle>Business portfolio</SectionTitle>
    <Card style={s.card}>
      <Text style={s.item}>Empire Motors</Text>
      <Text style={s.meta}>{game.carDealership.dealerships.length ? `${game.carDealership.dealerships[0].tier} dealership · ${game.carDealership.dealerships[0].vehicles.filter((vehicle) => vehicle.status !== "SOLD").length} vehicles` : "Open a hands-on vehicle trading business with market, workshop and showroom management."}</Text>
      <PrimaryButton title={game.carDealership.dealerships.length ? "OPEN CAR DEALERSHIP" : "START CAR DEALERSHIP"} onPress={() => router.push("/dealership" as Href)} />
    </Card>
    <SectionTitle>Business financials</SectionTitle><Card style={s.financials}>{[["Revenue", business.revenue], ["Product costs", -business.productCosts], ["Employee salaries", -business.salaryExpenses], ["Other expenses", -business.otherExpenses], ["Gross profit", grossProfit], ["Net profit", netProfit]].map(([label, amount]) => <View key={label as string} style={s.line}><Label>{label}</Label><Money value={amount as number} /></View>)}</Card>
    <SectionTitle>Market</SectionTitle>{MARKET_OFFERS.map((offer) => <Card key={offer.id} style={s.card}><View style={s.between}><View style={{ flex: 1 }}><Text style={s.item}>{offer.name}</Text><Text style={s.meta}>{offer.condition} · {offer.demand} demand</Text></View><View><Money value={offer.purchasePrice} /><Text style={s.value}>Value €{offer.marketValue}</Text></View></View><PrimaryButton title="BUY" disabled={game.cash < offer.purchasePrice} onPress={() => { try { update((state) => buyItem(state, offer)); } catch (error) { Alert.alert("Purchase failed", (error as Error).message); } }} /></Card>)}
    <SectionTitle>Inventory</SectionTitle>{business.inventory.length === 0 ? <Card><Text style={s.empty}>Buy your first product, choose a price, then advance time to find a buyer.</Text></Card> : business.inventory.map((item) => <InventoryRow key={item.id} item={item} />)}
    <SectionTitle>Sales history</SectionTitle>{business.sales.length === 0 ? <Text style={s.empty}>No sales yet.</Text> : business.sales.map((sale) => <View key={sale.id} style={s.sale}><Text style={s.item}>{sale.itemName}</Text><Text style={{ color: sale.profit >= 0 ? colors.green : colors.red, fontWeight: "900" }}>{sale.profit >= 0 ? "+" : ""}€{sale.profit}</Text></View>)}
  </ScrollView>;
}

const s = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg }, content: { padding: spacing.md, paddingTop: 60, paddingBottom: 120 }, kicker: { color: colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 1.5 }, title: { color: colors.text, fontSize: 34, fontWeight: "900", marginTop: 6, marginBottom: 18 }, summary: { flexDirection: "row", flexWrap: "wrap", gap: 22 }, metric: { color: colors.text, fontSize: 22, fontWeight: "900", marginTop: 4 }, card: { gap: 14, marginBottom: 10 }, between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }, item: { color: colors.text, fontSize: 16, fontWeight: "800" }, meta: { color: colors.muted, fontSize: 12, marginTop: 5 }, demand: { color: colors.green, fontWeight: "800" }, value: { color: colors.muted, fontSize: 10, textAlign: "right" }, listed: { color: colors.green, fontWeight: "800" }, listRow: { flexDirection: "row", gap: 10 }, input: { width: 100, height: 48, borderRadius: 14, backgroundColor: colors.surface2, color: colors.text, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, fontSize: 16 }, empty: { color: colors.muted, lineHeight: 21 }, sale: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }, actions: { flexDirection: "row", gap: 10, marginTop: 12 }, action: { flex: 1 }, financials: { gap: 12 }, line: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" } });
