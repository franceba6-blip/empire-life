import type {
  Vehicle,
  VehicleMarketState,
} from "@/game/businesses/carDealership/types";

const categoryBase: Record<Vehicle["category"], number> = {
  ECONOMY: 18_000,
  COMPACT: 27_000,
  SEDAN: 42_000,
  SUV: 55_000,
  SPORTS_CAR: 92_000,
  LUXURY: 115_000,
  SUPERCAR: 310_000,
  CLASSIC: 75_000,
  COMMERCIAL: 48_000,
};
const brandFactor: Record<string, number> = {
  Norda: 0.9,
  Velaro: 1,
  Vektor: 1.05,
  Aurex: 1.12,
  "Kronen Motors": 1.18,
  Solenne: 1.35,
  Cavaro: 1.48,
  Rossa: 1.7,
};

export function valueVehicle(
  vehicle: Pick<
    Vehicle,
    | "brand"
    | "category"
    | "year"
    | "mileage"
    | "mechanicalCondition"
    | "cosmeticCondition"
    | "demand"
    | "rarity"
    | "accidentHistory"
  >,
  market: VehicleMarketState,
  currentYear = 2026,
): number {
  const age = Math.max(0, currentYear - vehicle.year);
  const ageFactor = vehicle.category === "CLASSIC" && age >= 25
    ? 1 + Math.min(0.45, (age - 25) * 0.012)
    : Math.max(0.2, 1 - age * 0.075);
  const mileageFactor = Math.max(0.42, 1 - vehicle.mileage / 420_000);
  const conditionFactor =
    (vehicle.mechanicalCondition * 0.62 + vehicle.cosmeticCondition * 0.38) /
    100;
  const demandFactor = vehicle.demand === "HIGH" ? 1.1 : vehicle.demand === "LOW" ? 0.91 : 1;
  const rarityFactor = vehicle.rarity === "EXOTIC" ? 1.28 : vehicle.rarity === "RARE" ? 1.14 : vehicle.rarity === "UNCOMMON" ? 1.05 : 1;
  const marketFactor = market === "STRONG" ? 1.08 : market === "WEAK" ? 0.92 : 1;
  const accidentFactor = vehicle.accidentHistory ? 0.82 : 1;
  return Math.max(
    1_500,
    Math.round(
      (categoryBase[vehicle.category] *
        (brandFactor[vehicle.brand] ?? 1) *
        ageFactor *
        mileageFactor *
        (0.55 + conditionFactor * 0.55) *
        demandFactor *
        rarityFactor *
        marketFactor *
        accidentFactor) /
        100,
    ) * 100,
  );
}

export const vehicleRisk = (vehicle: Vehicle) => {
  const score =
    vehicle.hiddenRepairNeed * 0.45 +
    vehicle.repairNeed * 0.35 +
    (vehicle.accidentHistory && !vehicle.accidentHistoryKnown ? 25 : 0) +
    vehicle.mileage / 12_000;
  return score >= 55 ? "HIGH" : score >= 28 ? "MEDIUM" : "LOW";
};

export const recommendedPriceRange = (vehicle: Vehicle) => ({
  low: Math.round(vehicle.estimatedMarketValue * 0.96),
  high: Math.round(vehicle.estimatedMarketValue * 1.08),
});
