import type { GameDate } from "@/models/game";

export type DealershipTier = "SMALL" | "MEDIUM" | "PREMIUM";
export type VehicleCategory =
  | "ECONOMY"
  | "COMPACT"
  | "SEDAN"
  | "SUV"
  | "SPORTS_CAR"
  | "LUXURY"
  | "SUPERCAR"
  | "CLASSIC"
  | "COMMERCIAL";
export type VehicleStatus =
  | "MARKET"
  | "PURCHASED"
  | "IN_REPAIR"
  | "READY_FOR_SALE"
  | "LISTED"
  | "SOLD";
export type VehicleDemand = "LOW" | "MEDIUM" | "HIGH";
export type VehicleRarity = "COMMON" | "UNCOMMON" | "RARE" | "EXOTIC";
export type VehicleMarketState = "STRONG" | "NORMAL" | "WEAK";
export type PriceStrategy = "FAST_SALE" | "MARKET_PRICE" | "MAX_PROFIT" | "CUSTOM";
export type RepairLevel = "SMALL" | "MEDIUM" | "MAJOR";
export type PreparationLevel =
  | "BASIC_CLEANING"
  | "DETAILING"
  | "PAINT_CORRECTION"
  | "INTERIOR_REFRESH"
  | "PREMIUM_PREPARATION";

export interface VehicleHistoryEntry {
  id: string;
  type:
    | "GENERATED"
    | "INSPECTED"
    | "NEGOTIATED"
    | "PURCHASED"
    | "REPAIR_STARTED"
    | "REPAIR_COMPLETED"
    | "PREPARATION_STARTED"
    | "PREPARATION_COMPLETED"
    | "LISTED"
    | "PRICE_CHANGED"
    | "SOLD"
    | "DEBUG";
  gameDate: GameDate;
  description: string;
}

export interface VehicleWorkOrder {
  kind: "REPAIR" | "PREPARATION";
  level: RepairLevel | PreparationLevel;
  cost: number;
  startedAt: GameDate;
  completesAt: GameDate;
  mechanicalGain: number;
  cosmeticGain: number;
  valueGain: number;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  modelVariant: string;
  category: VehicleCategory;
  year: number;
  mileage: number;
  condition: number;
  purchasePrice: number;
  sellerPrice: number;
  estimatedMarketValue: number;
  askingPrice?: number;
  repairNeed: number;
  hiddenRepairNeed: number;
  cosmeticCondition: number;
  mechanicalCondition: number;
  demand: VehicleDemand;
  rarity: VehicleRarity;
  fuelType: "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC";
  transmission: "MANUAL" | "AUTOMATIC";
  color: string;
  previousOwners?: number;
  accidentHistory?: boolean;
  accidentHistoryKnown: boolean;
  daysInStock: number;
  dealershipId?: string;
  status: VehicleStatus;
  sellerPatience: number;
  inspected: boolean;
  inspectionAccuracy: number;
  repairCost: number;
  preparationCost: number;
  holdingCost: number;
  priceStrategy?: PriceStrategy;
  listedAt?: GameDate;
  soldAt?: GameDate;
  salePrice?: number;
  workOrder?: VehicleWorkOrder;
  history: VehicleHistoryEntry[];
}

export interface DealershipSale {
  id: string;
  vehicleId: string;
  vehicleName: string;
  salePrice: number;
  totalCost: number;
  profit: number;
  soldAt: GameDate;
  daysToSell: number;
  tradeInVehicleId?: string;
}

export interface DealershipLocation {
  id: string;
  name: string;
  capacity: number;
  localDemand: number;
  reputation: number;
  isPrimary: boolean;
}

export interface DealershipExpansion {
  id: string;
  type:
    | "SHOWROOM"
    | "WORKSHOP"
    | "PARKING"
    | "OFFICE"
    | "CUSTOMER_LOUNGE"
    | "PREMIUM_SHOWROOM"
    | "SECOND_LOCATION";
  level: number;
  cost: number;
  startedAt: GameDate;
  completesAt: GameDate;
  completed: boolean;
}

export interface DealershipFinancials {
  revenue: number;
  vehiclePurchaseCost: number;
  repairCost: number;
  preparationCost: number;
  holdingCost: number;
  expansionCost: number;
}

export interface CarDealership {
  id: string;
  businessId: string;
  name: string;
  tier: DealershipTier;
  reputation: number;
  capacity: number;
  showroomLevel: number;
  workshopLevel: number;
  officeLevel: number;
  loungeLevel: number;
  premiumShowroom: boolean;
  locations: DealershipLocation[];
  vehicles: Vehicle[];
  sales: DealershipSale[];
  financials: DealershipFinancials;
  expansions: DealershipExpansion[];
  createdAt: GameDate;
}

export interface DealershipEvent {
  id: string;
  type:
    | "HIGH_DEMAND_VEHICLE"
    | "RARE_VEHICLE"
    | "CUSTOMER_COMPLAINT"
    | "REPAIR_OVERRUN"
    | "DEMAND_SPIKE";
  title: string;
  description: string;
  gameDate: GameDate;
  dealershipId?: string;
}

export interface CustomerProfile {
  id: string;
  budget: number;
  categoryPreference: VehicleCategory;
  priceSensitivity: number;
  qualityPreference: number;
  createdAt: GameDate;
}

export interface CarDealershipState {
  dealerships: CarDealership[];
  marketOffers: Vehicle[];
  marketState: VehicleMarketState;
  marketGeneration: number;
  lastMarketRefresh: GameDate;
  categoryTrends: Partial<Record<VehicleCategory, VehicleDemand>>;
  activeCustomers: CustomerProfile[];
  events: DealershipEvent[];
}
