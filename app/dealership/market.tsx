import { ScrollView, StyleSheet, Text } from "react-native";
import { router, type Href } from "expo-router";
import { PrimaryButton } from "@/components/ui";
import { VehicleCard } from "@/components/VehicleCard";
import { useGameStore } from "@/store/gameStore";
import { colors } from "@/theme";
export default function VehicleMarket() {
  const game = useGameStore((state) => state.game);
  if (!game) return null;
  return <ScrollView style={s.root} contentContainerStyle={s.content}><PrimaryButton title="‹ DEALERSHIP" tone="dark" onPress={() => router.replace("/dealership" as Href)} /><Text style={s.kicker}>WHOLESALE MARKET · {game.carDealership.marketState}</Text><Text style={s.title}>Find the margin.</Text><Text style={s.copy}>Offers refresh every seven game days. Seller price can be above fair value; inspection reduces mechanical risk before capital is committed.</Text>{game.carDealership.marketOffers.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} onOpen={() => router.push(`/dealership/vehicle/${vehicle.id}` as Href)} />)}</ScrollView>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg }, content: { padding: 18, paddingTop: 55, paddingBottom: 100, gap: 12 }, kicker: { color: colors.gold, fontWeight: "900", letterSpacing: 1 }, title: { color: colors.text, fontSize: 31, fontWeight: "900" }, copy: { color: colors.muted, lineHeight: 21, marginBottom: 6 } });
