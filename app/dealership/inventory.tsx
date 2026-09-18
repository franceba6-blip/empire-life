import { ScrollView, StyleSheet, Text } from "react-native";
import { router, type Href } from "expo-router";
import { Card, PrimaryButton } from "@/components/ui";
import { VehicleCard } from "@/components/VehicleCard";
import { useGameStore } from "@/store/gameStore";
import { colors } from "@/theme";
export default function DealershipInventory() {
  const game = useGameStore((state) => state.game), dealership = game?.carDealership.dealerships[0];
  if (!game || !dealership) return null;
  const active = dealership.vehicles.filter((vehicle) => vehicle.status !== "SOLD");
  return <ScrollView style={s.root} contentContainerStyle={s.content}><PrimaryButton title="‹ DEALERSHIP" tone="dark" onPress={() => router.replace("/dealership" as Href)} /><Text style={s.kicker}>SHOWROOM & WORKSHOP</Text><Text style={s.title}>{active.length}/{dealership.capacity} vehicles</Text>{!active.length && <Card><Text style={s.copy}>Your showroom is empty. Buy a vehicle from the market to begin.</Text></Card>}{active.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} onOpen={() => router.push(`/dealership/vehicle/${vehicle.id}` as Href)} />)}</ScrollView>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg }, content: { padding: 18, paddingTop: 55, paddingBottom: 100, gap: 12 }, kicker: { color: colors.gold, fontWeight: "900", letterSpacing: 1 }, title: { color: colors.text, fontSize: 31, fontWeight: "900" }, copy: { color: colors.muted, lineHeight: 21 } });
