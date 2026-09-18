import type {
  CustomerProfile,
  Vehicle,
  VehicleCategory,
  VehicleMarketState,
} from "@/game/businesses/carDealership/types";
import { valueVehicle } from "@/game/businesses/carDealership/valuation";
import type { GameDate } from "@/models/game";

const catalog: Array<{
  brand: string;
  model: string;
  variant: string;
  category: VehicleCategory;
  fuel: Vehicle["fuelType"];
}> = [
  { brand: "Norda", model: "City", variant: "1.2 Urban", category: "ECONOMY", fuel: "PETROL" },
  { brand: "Velaro", model: "Pulse", variant: "E-Line", category: "COMPACT", fuel: "ELECTRIC" },
  { brand: "Vektor", model: "S4", variant: "Touring", category: "SEDAN", fuel: "DIESEL" },
  { brand: "Aurex", model: "Trail", variant: "Hybrid AWD", category: "SUV", fuel: "HYBRID" },
  { brand: "Kronen Motors", model: "K5", variant: "Executive", category: "LUXURY", fuel: "PETROL" },
  { brand: "Cavaro", model: "Sprint", variant: "GT", category: "SPORTS_CAR", fuel: "PETROL" },
  { brand: "Rossa", model: "Tempesta", variant: "V10", category: "SUPERCAR", fuel: "PETROL" },
  { brand: "Solenne", model: "Royale", variant: "Grand", category: "LUXURY", fuel: "HYBRID" },
  { brand: "Cavaro", model: "Heritage", variant: "S", category: "CLASSIC", fuel: "PETROL" },
  { brand: "Norda", model: "Carrier", variant: "L2 Cargo", category: "COMMERCIAL", fuel: "DIESEL" },
];
const colors = ["Obsidian", "Pearl White", "Graphite", "Midnight Blue", "Crimson", "Silver"];
const hash = (value: number) => Math.abs(Math.sin(value * 9301 + 49297) * 233280) % 1;

export function generateVehicleMarket(
  date: GameDate,
  generation: number,
  marketState: VehicleMarketState,
  count = 12,
): Vehicle[] {
  return Array.from({ length: count }, (_, index) => {
    const seed = date.year * 400 + date.month * 31 + date.day + generation * 97 + index * 17;
    const entry = catalog[Math.floor(hash(seed) * catalog.length)];
    const age = entry.category === "CLASSIC" ? 27 + Math.floor(hash(seed + 2) * 22) : 1 + Math.floor(hash(seed + 2) * 11);
    const year = 2026 - age;
    const mileage = entry.category === "CLASSIC" ? 35_000 + Math.floor(hash(seed + 3) * 145_000) : 8_000 + Math.floor(hash(seed + 3) * age * 24_000);
    const mechanicalCondition = Math.round(58 + hash(seed + 4) * 40);
    const cosmeticCondition = Math.round(55 + hash(seed + 5) * 43);
    const hiddenRepairNeed = Math.round(Math.max(0, 96 - mechanicalCondition) * (0.55 + hash(seed + 6)));
    const demand: Vehicle["demand"] = hash(seed + 7) > 0.68 ? "HIGH" : hash(seed + 7) < 0.22 ? "LOW" : "MEDIUM";
    const rarity: Vehicle["rarity"] = entry.category === "SUPERCAR" ? "EXOTIC" : entry.category === "CLASSIC" ? "RARE" : hash(seed + 8) > 0.82 ? "UNCOMMON" : "COMMON";
    const accidentHistory = hash(seed + 9) < 0.16;
    const partial = { brand: entry.brand, category: entry.category, year, mileage, mechanicalCondition, cosmeticCondition, demand, rarity, accidentHistory };
    const marketValue = valueVehicle(partial, marketState);
    const dealFactor = 0.83 + hash(seed + 10) * 0.35;
    const sellerPrice = Math.round((marketValue * dealFactor) / 100) * 100;
    return {
      id: `vehicle-${date.year}-${date.month}-${date.day}-${generation}-${index}`,
      brand: entry.brand,
      model: entry.model,
      modelVariant: entry.variant,
      category: entry.category,
      year,
      mileage,
      condition: Math.round((mechanicalCondition + cosmeticCondition) / 2),
      purchasePrice: 0,
      sellerPrice,
      estimatedMarketValue: marketValue,
      repairNeed: Math.round(hiddenRepairNeed * (0.55 + hash(seed + 11) * 0.25)),
      hiddenRepairNeed,
      cosmeticCondition,
      mechanicalCondition,
      demand,
      rarity,
      fuelType: entry.fuel,
      transmission: hash(seed + 12) > 0.28 ? "AUTOMATIC" : "MANUAL",
      color: colors[Math.floor(hash(seed + 13) * colors.length)],
      previousOwners: 1 + Math.floor(hash(seed + 14) * 4),
      accidentHistory,
      accidentHistoryKnown: false,
      daysInStock: 0,
      status: "MARKET",
      sellerPatience: Math.round(35 + hash(seed + 15) * 60),
      inspected: false,
      inspectionAccuracy: 0,
      repairCost: 0,
      preparationCost: 0,
      holdingCost: 0,
      history: [{ id: `history-${seed}`, type: "GENERATED", gameDate: { ...date }, description: "Vehicle entered the wholesale market" }],
    };
  });
}

export function generateCustomers(
  date: GameDate,
  marketState: VehicleMarketState,
  count = 10,
): CustomerProfile[] {
  const categories = catalog.map((item) => item.category);
  const marketBudget = marketState === "STRONG" ? 1.12 : marketState === "WEAK" ? 0.88 : 1;
  return Array.from({ length: count }, (_, index) => {
    const seed = date.year * 401 + date.month * 37 + date.day * 11 + index * 23;
    const categoryPreference = categories[Math.floor(hash(seed) * categories.length)];
    const baseBudget = categoryPreference === "SUPERCAR" ? 420_000 : categoryPreference === "LUXURY" || categoryPreference === "SPORTS_CAR" ? 140_000 : categoryPreference === "SUV" ? 75_000 : 42_000;
    return {
      id: `customer-${date.year}-${date.month}-${date.day}-${index}`,
      budget: Math.round(baseBudget * (0.65 + hash(seed + 1) * 0.75) * marketBudget),
      categoryPreference,
      priceSensitivity: Math.round(25 + hash(seed + 2) * 70),
      qualityPreference: Math.round(45 + hash(seed + 3) * 52),
      createdAt: { ...date },
    };
  });
}
