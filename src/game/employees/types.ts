import type { GameDate } from "@/models/game";

export type EmployeeRole =
  | "BUYER"
  | "SALES_EMPLOYEE"
  | "INVENTORY_WORKER"
  | "OPERATIONS_ASSISTANT"
  | "TEAM_LEADER"
  | "BUSINESS_MANAGER"
  | "GENERAL_MANAGER"
  | "VEHICLE_BUYER"
  | "SALESPERSON"
  | "MECHANIC"
  | "DETAILER"
  | "INVENTORY_MANAGER"
  | "SALES_MANAGER"
  | "DEALERSHIP_MANAGER";

export type EmployeeTrait =
  | "AMBITIOUS"
  | "LOYAL"
  | "FAST_LEARNER"
  | "NEGOTIATOR"
  | "ORGANIZED"
  | "UNRELIABLE"
  | "EXPENSIVE"
  | "SLOW_LEARNER"
  | "LOW_MOTIVATION"
  | "CONFLICT_PRONE";

export type StaffTask =
  | "PRODUCT_SOURCING"
  | "BUYING"
  | "LISTING"
  | "PRICING_ASSISTANCE"
  | "SELLING"
  | "INVENTORY_HANDLING"
  | "VEHICLE_SOURCING"
  | "VEHICLE_BUYING"
  | "VEHICLE_INSPECTION"
  | "VEHICLE_REPAIR"
  | "VEHICLE_PREPARATION"
  | "VEHICLE_LISTING"
  | "VEHICLE_PRICING"
  | "VEHICLE_SALES";

export type ManagementMode =
  | "SELF_MANAGED"
  | "PARTIALLY_DELEGATED"
  | "FULLY_MANAGED";
export type DelegationMode = "SELF" | "EMPLOYEE" | "MANAGER";

export interface EmployeeHistoryEntry {
  id: string;
  type:
    | "HIRED"
    | "SALARY_PAID"
    | "SALARY_OVERDUE"
    | "TRAINING_STARTED"
    | "TRAINING_COMPLETED"
    | "PROMOTED"
    | "SALARY_RAISE"
    | "FIRED"
    | "DEBUG";
  gameDate: GameDate;
  description: string;
}

export interface EmployeeContract {
  monthlySalary: number;
  nextPayDate: GameDate;
  overdueAmount: number;
  lastPaidDate?: GameDate;
}

export interface EmployeeTraining {
  level: "BASIC" | "ADVANCED" | "LEADERSHIP";
  startedAt: GameDate;
  completesAt: GameDate;
  skillGain: number;
  efficiencyGain: number;
  cost: number;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  role: EmployeeRole;
  salary: number;
  experience: number;
  skill: number;
  efficiency: number;
  reliability: number;
  loyalty: number;
  morale: number;
  workload: number;
  performance: number;
  leadership: number;
  employmentStatus: "ACTIVE" | "FIRED";
  hiredAtGameDate: GameDate;
  businessId: string;
  managerId?: string;
  traits: EmployeeTrait[];
  history: EmployeeHistoryEntry[];
  contractData: EmployeeContract;
  training?: EmployeeTraining;
}

export interface EmployeeCandidate {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  role: EmployeeRole;
  salaryExpectation: number;
  experience: number;
  skill: number;
  efficiency: number;
  reliability: number;
  loyalty: number;
  morale: number;
  leadership: number;
  traits: EmployeeTrait[];
}

export interface StaffState {
  candidates: EmployeeCandidate[];
  employees: Employee[];
  terminatedEmployees: Employee[];
  candidateGeneration: number;
  lastCandidateRefresh: GameDate;
}

export interface DelegationAssignment {
  task: StaffTask;
  mode: DelegationMode;
  employeeId?: string;
}

export interface BusinessManagement {
  mode: ManagementMode;
  delegations: DelegationAssignment[];
  automationEfficiency: number;
  managerId?: string;
  lastAutoBuyDate?: GameDate;
  lastAutoListDate?: GameDate;
}
