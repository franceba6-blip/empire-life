import type {
  DealershipTier,
  PreparationLevel,
  RepairLevel,
  VehicleCategory,
} from "@/game/businesses/carDealership/types";

export const DEALERSHIP_TIERS: Record<
  DealershipTier,
  { label: string; startupCost: number; capacity: number; reputation: number }
> = {
  SMALL: { label: "Small Used Car Dealership", startupCost: 40_000, capacity: 6, reputation: 42 },
  MEDIUM: { label: "Medium Dealership", startupCost: 250_000, capacity: 20, reputation: 55 },
  PREMIUM: { label: "Premium Dealership", startupCost: 1_500_000, capacity: 55, reputation: 70 },
};

export const REPAIRS: Record<RepairLevel, { baseCost: number; days: number; gain: number; valueFactor: number }> = {
  SMALL: { baseCost: 900, days: 2, gain: 8, valueFactor: 0.45 },
  MEDIUM: { baseCost: 3_800, days: 7, gain: 20, valueFactor: 0.52 },
  MAJOR: { baseCost: 12_500, days: 21, gain: 38, valueFactor: 0.48 },
};

export const PREPARATIONS: Record<PreparationLevel, { cost: number; days: number; gain: number; valueFactor: number }> = {
  BASIC_CLEANING: { cost: 180, days: 1, gain: 5, valueFactor: 0.7 },
  DETAILING: { cost: 650, days: 2, gain: 12, valueFactor: 0.75 },
  PAINT_CORRECTION: { cost: 1_800, days: 5, gain: 20, valueFactor: 0.68 },
  INTERIOR_REFRESH: { cost: 1_200, days: 4, gain: 16, valueFactor: 0.72 },
  PREMIUM_PREPARATION: { cost: 4_500, days: 8, gain: 30, valueFactor: 0.62 },
};

export const EXPANSIONS = {
  SHOWROOM: { cost: 75_000, days: 30, capacity: 8 },
  WORKSHOP: { cost: 120_000, days: 45, capacity: 0 },
  PARKING: { cost: 45_000, days: 21, capacity: 12 },
  OFFICE: { cost: 60_000, days: 25, capacity: 0 },
  CUSTOMER_LOUNGE: { cost: 90_000, days: 30, capacity: 0 },
  PREMIUM_SHOWROOM: { cost: 350_000, days: 75, capacity: 15 },
  SECOND_LOCATION: { cost: 500_000, days: 90, capacity: 25 },
} as const;

export const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  ECONOMY: "Economy",
  COMPACT: "Compact",
  SEDAN: "Sedan",
  SUV: "SUV",
  SPORTS_CAR: "Sports Car",
  LUXURY: "Luxury",
  SUPERCAR: "Supercar",
  CLASSIC: "Classic",
  COMMERCIAL: "Commercial Vehicle",
};
