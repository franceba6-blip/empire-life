import { Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Label, Money, PrimaryButton } from "./ui";
import { Property } from "@/game/realEstate/types";
import { LOCATIONS, PROPERTY_TYPES } from "@/game/realEstate/config";
import { propertyCashflow, propertyDebt } from "@/game/realEstate/realEstate";
import { colors } from "@/theme";
export function PropertyCard({
  property: p,
  onOpen,
}: {
  property: Property;
  onOpen: () => void;
}) {
  const premium = p.estimatedMarketValue >= 1000000;
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <LinearGradient
        colors={premium ? ["#453725", "#171B2D"] : ["#243541", "#18212B"]}
        style={s.art}
      >
        <Ionicons
          name={
            p.propertyType === "LAND"
              ? "map-outline"
              : premium
                ? "business-outline"
                : "home-outline"
          }
          size={66}
          color={premium ? "#E7C984" : "#88A8BC"}
        />
        <View>
          <Text style={s.badge}>
            {premium ? "SIGNATURE COLLECTION" : "CITY COLLECTION"}
          </Text>
          <Text style={s.title}>{PROPERTY_TYPES[p.propertyType].label}</Text>
        </View>
      </LinearGradient>
      <View style={s.body}>
        <Label>
          {LOCATIONS.find((l) => l.id === p.locationId)?.name} ·{" "}
          {p.size.toLocaleString()} m²
        </Label>
        <Money value={p.owned ? p.estimatedMarketValue : p.purchasePrice} />
        <Text style={s.copy}>
          {p.owned
            ? p.occupancyState.replaceAll("_", " ")
            : `Condition ${p.condition}/100`}{" "}
          {p.renovation ? "· Renovating" : ""}
        </Text>
        {p.owned ? (
          <Text style={s.copy}>
            Debt €{propertyDebt(p).toLocaleString()} · Net €
            {propertyCashflow(p).net.toLocaleString()}/mo
          </Text>
        ) : (
          <Text style={s.copy}>
            Potential rent €{p.monthlyRentPotential.toLocaleString()}/mo
          </Text>
        )}
        <PrimaryButton
          title={p.owned ? "MANAGE PROPERTY" : "VIEW PROPERTY"}
          tone="dark"
          onPress={onOpen}
        />
      </View>
    </Card>
  );
}
const s = StyleSheet.create({
  art: {
    padding: 22,
    minHeight: 160,
    justifyContent: "space-between",
    gap: 16,
  },
  badge: {
    color: "#DAC397",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  title: { color: colors.text, fontSize: 25, fontWeight: "800", marginTop: 5 },
  body: { padding: 18, gap: 12 },
  copy: { color: colors.muted, lineHeight: 20 },
});
