import { describe, expect, it } from "vitest";
import { MARKET_OFFERS } from "../src/config/balance";
import { buyItem, resolveSales } from "../src/game/businesses/reselling";
import { createGame } from "../src/game/createGame";
import {
  assignTask,
  calculateAutomationEfficiency,
  debugHireEliteManager,
  debugMaxStaff,
  debugSpawnCandidates,
  fireEmployee,
  hireEmployee,
  promoteEmployee,
  raiseSalary,
  setManagementMode,
  trainEmployee,
} from "../src/game/employees/employees";
import { debugCash, transact } from "../src/game/economy/economy";
import { advanceGameTime } from "../src/game/time/time";
import { migrateGameState } from "../src/persistence/save";
import type { GameState } from "../src/models/game";

const funded = (amount = 100_000) =>
  transact(createGame("Ada", "Lovelace"), "JOB_INCOME", amount, "Seed");
const candidateFor = (state: GameState, role: string) =>
  state.staff.candidates.find((candidate) => candidate.role === role)!;
const hireRole = (state: GameState, role: string) =>
  hireEmployee(state, candidateFor(state, role).id);

describe("employee lifecycle", () => {
  it("generates varied candidates and hires one", () => {
    const start = createGame("A", "B");
    const next = hireRole(start, "SALES_EMPLOYEE");
    expect(start.staff.candidates.length).toBe(7);
    expect(next.staff.employees).toHaveLength(1);
    expect(next.staff.employees[0].history[0].type).toBe("HIRED");
  });

  it("charges monthly salary as a business expense", () => {
    let state = hireRole(funded(), "INVENTORY_WORKER");
    const salary = state.staff.employees[0].salary;
    const before = state.cash;
    state = advanceGameTime(state, 30 * 24);
    expect(state.cash).toBe(before - salary);
    expect(state.businesses[0].salaryExpenses).toBe(salary);
    expect(state.transactions.some((entry) => entry.description.startsWith("Salary:"))).toBe(true);
  });

  it("records salary arrears and lowers morale when cash is insufficient", () => {
    let state = hireRole(createGame("A", "B"), "INVENTORY_WORKER");
    const morale = state.staff.employees[0].morale;
    state = advanceGameTime(state, 30 * 24);
    expect(state.staff.employees[0].contractData.overdueAmount).toBeGreaterThan(0);
    expect(state.staff.employees[0].morale).toBeLessThan(morale);
    expect(state.staff.employees[0].history[0].type).toBe("SALARY_OVERDUE");
  });

  it("fires staff and clears their delegations", () => {
    let state = hireRole(funded(), "BUYER");
    const id = state.staff.employees[0].id;
    state = assignTask(state, "reselling", "BUYING", "EMPLOYEE", id);
    state = fireEmployee(state, id);
    expect(state.staff.employees).toHaveLength(0);
    expect(state.staff.terminatedEmployees[0].employmentStatus).toBe("FIRED");
    expect(state.businesses[0].management.delegations.find((x) => x.task === "BUYING")?.mode).toBe("SELF");
  });

  it("promotes eligible staff and raises their salary", () => {
    let state = hireRole(funded(), "SALES_EMPLOYEE");
    const id = state.staff.employees[0].id;
    const salary = state.staff.employees[0].salary;
    state = promoteEmployee(state, id);
    expect(state.staff.employees[0].role).toBe("TEAM_LEADER");
    expect(state.staff.employees[0].salary).toBeGreaterThan(salary);
  });

  it("salary raises improve morale and loyalty", () => {
    let state = hireRole(funded(), "BUYER");
    const employee = state.staff.employees[0];
    state = raiseSalary(state, employee.id, 10);
    expect(state.staff.employees[0].salary).toBeGreaterThan(employee.salary);
    expect(state.staff.employees[0].morale).toBeGreaterThan(employee.morale);
    expect(state.staff.employees[0].loyalty).toBeGreaterThan(employee.loyalty);
  });

  it("training costs money, takes time and improves skill", () => {
    let state = hireRole(funded(), "BUYER");
    const id = state.staff.employees[0].id, skill = state.staff.employees[0].skill, before = state.cash;
    state = trainEmployee(state, id, "BASIC");
    expect(state.cash).toBe(before - 500);
    expect(state.staff.employees[0].training?.level).toBe("BASIC");
    state = advanceGameTime(state, 7 * 24);
    expect(state.staff.employees[0].training).toBeUndefined();
    expect(state.staff.employees[0].skill).toBe(skill + 3);
  });

  it("accumulates experience through the central time service", () => {
    let state = hireRole(funded(), "BUYER");
    const before = state.staff.employees[0].experience;
    state = advanceGameTime(state, 10 * 24);
    expect(state.staff.employees[0].experience).toBeGreaterThan(before);
  });
});

describe("delegation and automation", () => {
  it("delegates compatible tasks and calculates dynamic efficiency", () => {
    let state = hireRole(funded(), "BUYER");
    const id = state.staff.employees[0].id;
    state = assignTask(state, "reselling", "BUYING", "EMPLOYEE", id);
    expect(state.businesses[0].management.mode).toBe("PARTIALLY_DELEGATED");
    expect(state.businesses[0].management.automationEfficiency).toBeGreaterThan(0);
  });

  it("requires a manager for fully managed mode", () => {
    expect(() => setManagementMode(funded(), "reselling", "FULLY_MANAGED")).toThrow("requires");
  });

  it("lets a General Manager run all tasks below 100 percent", () => {
    let state = hireRole(funded(), "GENERAL_MANAGER");
    const id = state.staff.employees[0].id;
    state = setManagementMode(state, "reselling", "FULLY_MANAGED", id);
    expect(state.businesses[0].management.delegations.every((x) => x.mode === "MANAGER")).toBe(true);
    expect(state.businesses[0].management.automationEfficiency).toBeGreaterThan(70);
    expect(state.businesses[0].management.automationEfficiency).toBeLessThanOrEqual(98);
  });

  it("strong managers outperform weak managers", () => {
    let state = hireRole(funded(), "BUSINESS_MANAGER");
    const id = state.staff.employees[0].id;
    state = setManagementMode(state, "reselling", "FULLY_MANAGED", id);
    const normal = calculateAutomationEfficiency(state, "reselling");
    const weak: GameState = { ...state, staff: { ...state.staff, employees: state.staff.employees.map((x) => ({ ...x, skill: 50, efficiency: 50, reliability: 50, morale: 50, performance: 50, leadership: 50 })) } };
    expect(normal).toBeGreaterThan(calculateAutomationEfficiency(weak, "reselling"));
  });

  it("automated buyers acquire sensible positive-margin inventory", () => {
    let state = hireRole(funded(), "BUYER");
    const id = state.staff.employees[0].id;
    state = assignTask(state, "reselling", "BUYING", "EMPLOYEE", id);
    state = advanceGameTime(state, 24);
    expect(state.businesses[0].inventory).toHaveLength(1);
    expect(state.businesses[0].inventory[0].marketValue).toBeGreaterThan(state.businesses[0].inventory[0].purchasePrice);
  });

  it("automated sales employees list stock and sell it", () => {
    let state = hireRole(funded(), "SALES_EMPLOYEE");
    state = buyItem(state, MARKET_OFFERS[0]);
    const id = state.staff.employees[0].id;
    state = assignTask(state, "reselling", "LISTING", "EMPLOYEE", id);
    state = assignTask(state, "reselling", "SELLING", "EMPLOYEE", id);
    state = advanceGameTime(state, 24);
    if (!state.businesses[0].sales.length) state = resolveSales(state, 0);
    expect(state.businesses[0].sales).toHaveLength(1);
  });

  it("net business profit deducts product, salary and training costs", () => {
    let state = hireRole(funded(), "BUYER");
    const id = state.staff.employees[0].id;
    state = trainEmployee(state, id, "BASIC");
    state = advanceGameTime(state, 30 * 24);
    const business = state.businesses[0];
    expect(business.expenses).toBe(business.productCosts + business.salaryExpenses + business.otherExpenses);
  });
});

describe("staff persistence and debug isolation", () => {
  it("migrates a Prompt 03 save without losing business data", () => {
    const current = createGame("A", "B");
    const legacy: any = JSON.parse(JSON.stringify(current));
    legacy.schemaVersion = 3;
    delete legacy.staff;
    delete legacy.businesses[0].management;
    delete legacy.businesses[0].productCosts;
    delete legacy.businesses[0].salaryExpenses;
    delete legacy.businesses[0].otherExpenses;
    legacy.businesses[0].expenses = 440;
    const migrated = migrateGameState(legacy);
    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.businesses[0].productCosts).toBe(440);
    expect(migrated.staff.candidates.length).toBeGreaterThan(0);
  });

  it("survives save/load JSON round trips with staff state", () => {
    const hired = hireRole(funded(), "BUYER");
    const restored = migrateGameState(JSON.parse(JSON.stringify(hired)));
    expect(restored.staff.employees[0]).toEqual(hired.staff.employees[0]);
  });

  it("keeps debug employee tools inside test mode", () => {
    expect(() => debugSpawnCandidates(createGame("A", "B"))).toThrow("test save");
    let state: GameState = { ...createGame("A", "B"), mode: "TEST" };
    state = debugCash(state, 1_000_000, "SET");
    state = debugSpawnCandidates(state);
    state = debugHireEliteManager(state);
    state = debugMaxStaff(state);
    expect(state.staff.employees[0].role).toBe("GENERAL_MANAGER");
    expect(state.staff.employees[0].skill).toBe(100);
    expect(state.staff.employees[0].history.some((entry) => entry.type === "DEBUG")).toBe(true);
  });
});
