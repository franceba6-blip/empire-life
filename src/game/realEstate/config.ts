import { PropertyType, RenovationLevel } from "./types";
export const PROPERTY_TYPES: Record<
  PropertyType,
  {
    label: string;
    price: number;
    size: number;
    residential: boolean;
    yield: number;
  }
> = {
  STUDIO: {
    label: "Studio Apartment",
    price: 90000,
    size: 32,
    residential: true,
    yield: 0.065,
  },
  APARTMENT: {
    label: "Apartment",
    price: 240000,
    size: 85,
    residential: true,
    yield: 0.06,
  },
  HOUSE: {
    label: "House",
    price: 420000,
    size: 160,
    residential: true,
    yield: 0.052,
  },
  LUXURY_HOUSE: {
    label: "Luxury House",
    price: 1500000,
    size: 310,
    residential: true,
    yield: 0.043,
  },
  VILLA: {
    label: "Villa",
    price: 3900000,
    size: 580,
    residential: true,
    yield: 0.037,
  },
  PENTHOUSE: {
    label: "Penthouse",
    price: 5800000,
    size: 370,
    residential: true,
    yield: 0.035,
  },
  SMALL_BUILDING: {
    label: "Small Apartment Building",
    price: 950000,
    size: 650,
    residential: false,
    yield: 0.07,
  },
  LARGE_BUILDING: {
    label: "Large Apartment Building",
    price: 4500000,
    size: 3300,
    residential: false,
    yield: 0.073,
  },
  OFFICE: {
    label: "Office",
    price: 650000,
    size: 320,
    residential: false,
    yield: 0.075,
  },
  RETAIL: {
    label: "Retail Unit",
    price: 380000,
    size: 170,
    residential: false,
    yield: 0.07,
  },
  WAREHOUSE: {
    label: "Warehouse",
    price: 800000,
    size: 1400,
    residential: false,
    yield: 0.08,
  },
  HOTEL: {
    label: "Hotel Property",
    price: 6500000,
    size: 4200,
    residential: false,
    yield: 0.068,
  },
  LAND: {
    label: "Land Plot",
    price: 130000,
    size: 1800,
    residential: false,
    yield: 0,
  },
};
export const LOCATIONS = [
  {
    id: "small",
    name: "Small City",
    price: 0.8,
    rent: 0.85,
    demand: 0.8,
    growth: 0.0005,
    cost: 0.8,
  },
  {
    id: "major",
    name: "Major City",
    price: 1.1,
    rent: 1.2,
    demand: 0.95,
    growth: 0.001,
    cost: 1.1,
  },
  {
    id: "premium",
    name: "Premium District",
    price: 1.5,
    rent: 1.35,
    demand: 0.9,
    growth: 0.0015,
    cost: 1.3,
  },
  {
    id: "business",
    name: "Business District",
    price: 1.2,
    rent: 1.3,
    demand: 0.9,
    growth: 0.001,
    cost: 1.15,
  },
  {
    id: "coastal",
    name: "Coastal Luxury Area",
    price: 1.8,
    rent: 1.4,
    demand: 0.75,
    growth: 0.002,
    cost: 1.4,
  },
];
export const RENOVATIONS: Record<
  RenovationLevel,
  {
    minimum: number;
    ratio: number;
    days: number;
    improvement: number;
    value: number;
    rent: number;
  }
> = {
  SMALL: {
    minimum: 5000,
    ratio: 0.025,
    days: 7,
    improvement: 8,
    value: 0.018,
    rent: 0.025,
  },
  MEDIUM: {
    minimum: 15000,
    ratio: 0.065,
    days: 25,
    improvement: 18,
    value: 0.05,
    rent: 0.07,
  },
  MAJOR: {
    minimum: 50000,
    ratio: 0.18,
    days: 60,
    improvement: 35,
    value: 0.13,
    rent: 0.16,
  },
  LUXURY: {
    minimum: 250000,
    ratio: 0.3,
    days: 120,
    improvement: 50,
    value: 0.18,
    rent: 0.2,
  },
};
export const MARKET = {
  STRONG: { growth: 0.003, demand: 1.1, rent: 1.002, sale: 1.02 },
  NORMAL: { growth: 0, demand: 1, rent: 1, sale: 1 },
  WEAK: { growth: -0.004, demand: 0.75, rent: 0.998, sale: 0.96 },
};
export const MANAGEMENT_FEE = 0.12;
export const SALE_FEE = 0.03;
