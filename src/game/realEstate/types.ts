import { GameDate } from "@/models/game";
export type PropertyType =
  | "STUDIO"
  | "APARTMENT"
  | "HOUSE"
  | "LUXURY_HOUSE"
  | "VILLA"
  | "PENTHOUSE"
  | "SMALL_BUILDING"
  | "LARGE_BUILDING"
  | "OFFICE"
  | "RETAIL"
  | "WAREHOUSE"
  | "HOTEL"
  | "LAND";
export type RenovationLevel = "SMALL" | "MEDIUM" | "MAJOR" | "LUXURY";
export interface Mortgage {
  principal: number;
  downPayment: number;
  apr: number;
  monthlyPayment: number;
  remainingBalance: number;
  termMonths: number;
  paymentsMade: number;
  arrears: number;
}
export interface Property {
  id: string;
  propertyType: PropertyType;
  locationId: string;
  size: number;
  rooms?: number;
  condition: number;
  purchasePrice: number;
  estimatedMarketValue: number;
  monthlyRentPotential: number;
  monthlyOperatingCosts: number;
  maintenanceRate: number;
  renovationPotential: number;
  occupancyState: "VACANT" | "RENTED" | "OWNER_OCCUPIED";
  createdAt: GameDate;
  acquiredAt?: GameDate;
  nextBillingAt?: GameDate;
  owned: boolean;
  mortgage?: Mortgage;
  tenant?: {
    quality: number;
    rentPaid: boolean;
    leaseStart: GameDate;
    monthlyRent: number;
  };
  management: "SELF" | "MANAGER";
  renovation?: {
    level: RenovationLevel;
    cost: number;
    completesAt: GameDate;
    improvement: number;
    valueGain: number;
    rentGain: number;
  };
  renovationSpent: number;
  arrears: number;
}
export interface PropertySale {
  id: string;
  propertyId: string;
  soldAt: GameDate;
  price: number;
  fees: number;
  mortgagePayoff: number;
  profit: number;
}
export interface RealEstateState {
  listings: Property[];
  properties: Property[];
  sales: PropertySale[];
  market: "STRONG" | "NORMAL" | "WEAK";
  lastMarketMonth: string;
}
