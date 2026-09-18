import { StyleSheet, Text, View } from "react-native";
import { Card, Label, Money, PrimaryButton } from "@/components/ui";
import { CATEGORY_LABELS } from "@/game/businesses/carDealership/config";
import type { Vehicle } from "@/game/businesses/carDealership/types";
import { colors } from "@/theme";

export function VehicleCard({ vehicle, onOpen }: { vehicle: Vehicle; onOpen: () => void }) {
  const premium = ["LUXURY", "SPORTS_CAR", "SUPERCAR", "CLASSIC"].includes(vehicle.category);
  return <Card style={[s.card, premium ? s.premium : undefined]}>
    <View style={[s.silhouette, premium ? s.premiumSilhouette : undefined]}><Text style={s.carMark}>{premium ? "◆" : "◇"}</Text><Text style={s.category}>{CATEGORY_LABELS[vehicle.category]}</Text></View>
    <View style={s.row}><View style={{ flex: 1 }}><Text style={s.name}>{vehicle.brand} {vehicle.model}</Text><Text style={s.variant}>{vehicle.modelVariant} · {vehicle.year}</Text></View><View><Label>{vehicle.status === "MARKET" ? "SELLER PRICE" : vehicle.status}</Label><Money value={vehicle.status === "MARKET" ? vehicle.sellerPrice : vehicle.askingPrice ?? vehicle.estimatedMarketValue} /></View></View>
    <Text style={s.meta}>{vehicle.mileage.toLocaleString()} km · Condition {vehicle.condition}% · {vehicle.demand} demand · {vehicle.rarity}</Text>
    <Text style={s.value}>Market value €{vehicle.estimatedMarketValue.toLocaleString()} · Mechanical {vehicle.mechanicalCondition}% · Cosmetic {vehicle.cosmeticCondition}%</Text>
    <PrimaryButton title="VIEW VEHICLE" tone="dark" onPress={onOpen} />
  </Card>;
}
const s = StyleSheet.create({ card: { gap: 12, borderLeftWidth: 3, borderLeftColor: colors.blue }, premium: { borderLeftColor: colors.gold, backgroundColor: "#15151B" }, silhouette: { height: 72, borderRadius: 15, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" }, premiumSilhouette: { backgroundColor: "#2A2115" }, carMark: { color: colors.gold, fontSize: 28 }, category: { color: colors.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1 }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }, name: { color: colors.text, fontSize: 19, fontWeight: "900" }, variant: { color: colors.gold, marginTop: 3, fontWeight: "700" }, meta: { color: colors.muted, lineHeight: 20 }, value: { color: colors.text, fontWeight: "700" } });
