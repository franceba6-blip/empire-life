import type {
  EmployeeRole,
  EmployeeTrait,
  StaffTask,
} from "@/game/employees/types";

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  BUYER: "Buyer / Purchasing",
  SALES_EMPLOYEE: "Sales Employee",
  INVENTORY_WORKER: "Inventory Worker",
  OPERATIONS_ASSISTANT: "Operations Assistant",
  TEAM_LEADER: "Team Leader",
  BUSINESS_MANAGER: "Business Manager",
  GENERAL_MANAGER: "General Manager",
  VEHICLE_BUYER: "Vehicle Buyer",
  SALESPERSON: "Salesperson",
  MECHANIC: "Mechanic",
  DETAILER: "Detailer",
  INVENTORY_MANAGER: "Inventory Manager",
  SALES_MANAGER: "Sales Manager",
  DEALERSHIP_MANAGER: "Dealership Manager",
};

export const TRAIT_LABELS: Record<EmployeeTrait, string> = {
  AMBITIOUS: "Ambitious",
  LOYAL: "Loyal",
  FAST_LEARNER: "Fast Learner",
  NEGOTIATOR: "Negotiator",
  ORGANIZED: "Organized",
  UNRELIABLE: "Unreliable",
  EXPENSIVE: "Expensive",
  SLOW_LEARNER: "Slow Learner",
  LOW_MOTIVATION: "Low Motivation",
  CONFLICT_PRONE: "Conflict Prone",
};

export const STAFF_TASKS: StaffTask[] = [
  "PRODUCT_SOURCING",
  "BUYING",
  "LISTING",
  "PRICING_ASSISTANCE",
  "SELLING",
  "INVENTORY_HANDLING",
];
export const DEALERSHIP_TASKS: StaffTask[] = [
  "VEHICLE_SOURCING",
  "VEHICLE_BUYING",
  "VEHICLE_INSPECTION",
  "VEHICLE_REPAIR",
  "VEHICLE_PREPARATION",
  "VEHICLE_LISTING",
  "VEHICLE_PRICING",
  "VEHICLE_SALES",
];

export const TASK_LABELS: Record<StaffTask, string> = {
  PRODUCT_SOURCING: "Product Sourcing",
  BUYING: "Buying",
  LISTING: "Listing",
  PRICING_ASSISTANCE: "Pricing Assistance",
  SELLING: "Selling",
  INVENTORY_HANDLING: "Inventory Handling",
  VEHICLE_SOURCING: "Vehicle Sourcing",
  VEHICLE_BUYING: "Vehicle Buying",
  VEHICLE_INSPECTION: "Vehicle Inspection",
  VEHICLE_REPAIR: "Vehicle Repair",
  VEHICLE_PREPARATION: "Vehicle Preparation",
  VEHICLE_LISTING: "Vehicle Listing",
  VEHICLE_PRICING: "Vehicle Pricing",
  VEHICLE_SALES: "Vehicle Sales",
};

export const ROLE_TASKS: Record<EmployeeRole, StaffTask[]> = {
  BUYER: ["PRODUCT_SOURCING", "BUYING", "PRICING_ASSISTANCE"],
  SALES_EMPLOYEE: ["LISTING", "PRICING_ASSISTANCE", "SELLING"],
  INVENTORY_WORKER: ["INVENTORY_HANDLING"],
  OPERATIONS_ASSISTANT: ["LISTING", "INVENTORY_HANDLING"],
  TEAM_LEADER: STAFF_TASKS,
  BUSINESS_MANAGER: STAFF_TASKS,
  GENERAL_MANAGER: [...STAFF_TASKS, ...DEALERSHIP_TASKS],
  VEHICLE_BUYER: ["VEHICLE_SOURCING", "VEHICLE_BUYING", "VEHICLE_INSPECTION"],
  SALESPERSON: ["VEHICLE_LISTING", "VEHICLE_PRICING", "VEHICLE_SALES"],
  MECHANIC: ["VEHICLE_INSPECTION", "VEHICLE_REPAIR"],
  DETAILER: ["VEHICLE_PREPARATION"],
  INVENTORY_MANAGER: ["VEHICLE_SOURCING", "VEHICLE_LISTING", "INVENTORY_HANDLING"],
  SALES_MANAGER: ["VEHICLE_LISTING", "VEHICLE_PRICING", "VEHICLE_SALES"],
  DEALERSHIP_MANAGER: [
    "VEHICLE_SOURCING",
    "VEHICLE_BUYING",
    "VEHICLE_INSPECTION",
    "VEHICLE_REPAIR",
    "VEHICLE_PREPARATION",
    "VEHICLE_LISTING",
    "VEHICLE_PRICING",
    "VEHICLE_SALES",
  ],
};

export const TRAINING = {
  BASIC: { cost: 500, days: 7, skillGain: 3, efficiencyGain: 2 },
  ADVANCED: { cost: 1800, days: 20, skillGain: 7, efficiencyGain: 4 },
  LEADERSHIP: { cost: 3500, days: 30, skillGain: 5, efficiencyGain: 3 },
} as const;
