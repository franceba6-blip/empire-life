import { MARKET_OFFERS } from "@/config/balance";
import { buyItem, listItem } from "@/game/businesses/reselling";
import { ROLE_TASKS, STAFF_TASKS, TRAINING } from "@/game/employees/config";
import type {
  BusinessManagement,
  Employee,
  EmployeeCandidate,
  EmployeeRole,
  EmployeeTrait,
  ManagementMode,
  StaffState,
  StaffTask,
} from "@/game/employees/types";
import { transact } from "@/game/economy/economy";
import type { GameDate, GameState } from "@/models/game";
import { makeId } from "@/utils/id";

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));
const addCalendarDays = (date: GameDate, days: number): GameDate => {
  const value = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
  };
};
const dateDistance = (from: GameDate, to: GameDate) =>
  Math.floor(
    (Date.UTC(to.year, to.month - 1, to.day) -
      Date.UTC(from.year, from.month - 1, from.day)) /
      86_400_000,
  );

export const defaultManagement = (): BusinessManagement => ({
  mode: "SELF_MANAGED",
  delegations: STAFF_TASKS.map((task) => ({ task, mode: "SELF" })),
  automationEfficiency: 0,
});

const candidateSeeds: Array<{
  firstName: string;
  lastName: string;
  role: EmployeeRole;
  base: number;
  reliability: number;
  salary: number;
  leadership: number;
  traits: EmployeeTrait[];
}> = [
  { firstName: "Anna", lastName: "Keller", role: "SALES_EMPLOYEE", base: 76, reliability: 88, salary: 3100, leadership: 56, traits: ["NEGOTIATOR"] },
  { firstName: "Leon", lastName: "Brandt", role: "BUYER", base: 69, reliability: 75, salary: 2800, leadership: 48, traits: ["AMBITIOUS", "FAST_LEARNER"] },
  { firstName: "Mira", lastName: "Seidel", role: "INVENTORY_WORKER", base: 73, reliability: 92, salary: 2450, leadership: 42, traits: ["ORGANIZED", "LOYAL"] },
  { firstName: "David", lastName: "Nguyen", role: "OPERATIONS_ASSISTANT", base: 64, reliability: 81, salary: 2700, leadership: 59, traits: ["FAST_LEARNER"] },
  { firstName: "Sofia", lastName: "Moretti", role: "TEAM_LEADER", base: 82, reliability: 86, salary: 4700, leadership: 83, traits: ["ORGANIZED", "AMBITIOUS"] },
  { firstName: "Jonas", lastName: "Voss", role: "BUSINESS_MANAGER", base: 78, reliability: 70, salary: 7200, leadership: 79, traits: ["EXPENSIVE", "NEGOTIATOR"] },
  { firstName: "Elena", lastName: "Fischer", role: "GENERAL_MANAGER", base: 91, reliability: 93, salary: 14500, leadership: 94, traits: ["LOYAL", "ORGANIZED"] },
  { firstName: "Luca", lastName: "Marin", role: "VEHICLE_BUYER", base: 79, reliability: 84, salary: 4200, leadership: 55, traits: ["NEGOTIATOR", "AMBITIOUS"] },
  { firstName: "Nina", lastName: "Wolf", role: "SALESPERSON", base: 75, reliability: 80, salary: 3600, leadership: 58, traits: ["NEGOTIATOR"] },
  { firstName: "Emir", lastName: "Kaya", role: "MECHANIC", base: 83, reliability: 91, salary: 4800, leadership: 48, traits: ["ORGANIZED", "LOYAL"] },
  { firstName: "Mia", lastName: "Hartmann", role: "DETAILER", base: 77, reliability: 88, salary: 3300, leadership: 44, traits: ["ORGANIZED"] },
  { firstName: "Paul", lastName: "Neumann", role: "INVENTORY_MANAGER", base: 72, reliability: 86, salary: 5100, leadership: 70, traits: ["LOYAL"] },
  { firstName: "Laura", lastName: "Winter", role: "SALES_MANAGER", base: 85, reliability: 82, salary: 6900, leadership: 84, traits: ["AMBITIOUS", "NEGOTIATOR"] },
  { firstName: "Mateo", lastName: "Rossi", role: "DEALERSHIP_MANAGER", base: 88, reliability: 90, salary: 9800, leadership: 91, traits: ["ORGANIZED", "NEGOTIATOR"] },
];

export function generateCandidates(
  date: GameDate,
  generation = 0,
): EmployeeCandidate[] {
  return candidateSeeds.map((seed, index) => {
    const drift = ((generation * 7 + index * 3) % 11) - 5;
    const skill = clamp(seed.base + drift);
    return {
      id: `candidate-${date.year}-${date.month}-${generation}-${index}`,
      firstName: seed.firstName,
      lastName: seed.lastName,
      age: 23 + ((index * 5 + generation) % 24),
      role: seed.role,
      salaryExpectation: Math.round(seed.salary * (1 + drift / 100)),
      experience: Math.max(1, Math.round((skill - 48) / 6)),
      skill,
      efficiency: clamp(skill + ((index % 3) - 1) * 4),
      reliability: clamp(seed.reliability - drift),
      loyalty: clamp(58 + index * 4 - Math.max(0, drift)),
      morale: 72,
      leadership: clamp(seed.leadership + Math.floor(drift / 2)),
      traits: seed.traits,
    };
  });
}

export const initialStaffState = (date: GameDate): StaffState => ({
  candidates: generateCandidates(date),
  employees: [],
  terminatedEmployees: [],
  candidateGeneration: 0,
  lastCandidateRefresh: { ...date },
});

const traitAdjustment = (employee: Pick<Employee, "traits">) =>
  employee.traits.reduce(
    (sum, trait) =>
      sum +
      (["AMBITIOUS", "LOYAL", "FAST_LEARNER", "NEGOTIATOR", "ORGANIZED"].includes(trait)
        ? 2
        : -3),
    0,
  );

export function calculatePerformance(
  employee: Employee,
  manager?: Employee,
): number {
  const managerBoost = manager
    ? (manager.leadership + manager.performance - 100) * 0.08
    : 0;
  const overload = Math.max(0, employee.workload - 80) * 0.22;
  return Math.round(
    clamp(
      employee.skill * 0.28 +
        employee.efficiency * 0.22 +
        employee.reliability * 0.16 +
        employee.morale * 0.2 +
        Math.min(100, employee.experience * 8) * 0.14 +
        traitAdjustment(employee) +
        managerBoost -
        overload,
    ),
  );
}

export function hireEmployee(
  state: GameState,
  candidateId: string,
  businessId = "reselling",
): GameState {
  const candidate = state.staff.candidates.find((x) => x.id === candidateId);
  if (!candidate) throw new Error("Candidate is no longer available");
  if (!state.businesses.some((x) => x.id === businessId))
    throw new Error("Business not found");
  const employee: Employee = {
    ...candidate,
    id: makeId("employee"),
    salary: candidate.salaryExpectation,
    workload: 0,
    performance: 0,
    employmentStatus: "ACTIVE",
    hiredAtGameDate: { ...state.date },
    businessId,
    history: [
      {
        id: makeId("staff-history"),
        type: "HIRED",
        gameDate: { ...state.date },
        description: `Hired as ${candidate.role}`,
      },
    ],
    contractData: {
      monthlySalary: candidate.salaryExpectation,
      nextPayDate: addCalendarDays(state.date, 30),
      overdueAmount: 0,
    },
  };
  employee.performance = calculatePerformance(employee);
  return {
    ...state,
    staff: {
      ...state.staff,
      employees: [...state.staff.employees, employee],
      candidates: state.staff.candidates.filter((x) => x.id !== candidateId),
    },
  };
}

const updateEmployee = (
  state: GameState,
  employeeId: string,
  fn: (employee: Employee) => Employee,
): GameState => {
  if (!state.staff.employees.some((x) => x.id === employeeId))
    throw new Error("Employee not found");
  return {
    ...state,
    staff: {
      ...state.staff,
      employees: state.staff.employees.map((employee) =>
        employee.id === employeeId ? fn(employee) : employee,
      ),
    },
  };
};

const addHistory = (
  employee: Employee,
  state: GameState,
  type: Employee["history"][number]["type"],
  description: string,
): Employee => ({
  ...employee,
  history: [
    { id: makeId("staff-history"), type, gameDate: { ...state.date }, description },
    ...employee.history,
  ],
});

export function raiseSalary(
  state: GameState,
  employeeId: string,
  percent = 10,
): GameState {
  if (!Number.isFinite(percent) || percent < 2 || percent > 50)
    throw new Error("Raise must be between 2% and 50%");
  return updateEmployee(state, employeeId, (employee) => {
    const salary = Math.round(employee.salary * (1 + percent / 100));
    return addHistory(
      {
        ...employee,
        salary,
        morale: clamp(employee.morale + 8),
        loyalty: clamp(employee.loyalty + 5),
        contractData: { ...employee.contractData, monthlySalary: salary },
      },
      state,
      "SALARY_RAISE",
      `Salary raised by ${percent}% to €${salary}`,
    );
  });
}

const nextRole: Partial<Record<EmployeeRole, EmployeeRole>> = {
  BUYER: "TEAM_LEADER",
  SALES_EMPLOYEE: "TEAM_LEADER",
  INVENTORY_WORKER: "OPERATIONS_ASSISTANT",
  OPERATIONS_ASSISTANT: "TEAM_LEADER",
  TEAM_LEADER: "BUSINESS_MANAGER",
  BUSINESS_MANAGER: "GENERAL_MANAGER",
  VEHICLE_BUYER: "INVENTORY_MANAGER",
  SALESPERSON: "SALES_MANAGER",
  MECHANIC: "DEALERSHIP_MANAGER",
  DETAILER: "INVENTORY_MANAGER",
  INVENTORY_MANAGER: "DEALERSHIP_MANAGER",
  SALES_MANAGER: "DEALERSHIP_MANAGER",
  DEALERSHIP_MANAGER: "GENERAL_MANAGER",
};

export function promoteEmployee(state: GameState, employeeId: string): GameState {
  return updateEmployee(state, employeeId, (employee) => {
    const role = nextRole[employee.role];
    if (!role) throw new Error("No further promotion is available");
    if (employee.skill < 60 || employee.performance < 55)
      throw new Error("Employee is not ready for promotion");
    const salary = Math.round(employee.salary * 1.22);
    return addHistory(
      {
        ...employee,
        role,
        salary,
        morale: clamp(employee.morale + 12),
        loyalty: clamp(employee.loyalty + 7),
        contractData: { ...employee.contractData, monthlySalary: salary },
      },
      state,
      "PROMOTED",
      `Promoted to ${role}`,
    );
  });
}

export function trainEmployee(
  state: GameState,
  employeeId: string,
  level: keyof typeof TRAINING,
): GameState {
  const employee = state.staff.employees.find((x) => x.id === employeeId);
  if (!employee) throw new Error("Employee not found");
  if (employee.training) throw new Error("Training is already in progress");
  const plan = TRAINING[level];
  let next = transact(
    state,
    "BUSINESS_EXPENSE",
    plan.cost,
    `${level} training for ${employee.firstName} ${employee.lastName}`,
    employeeId,
  );
  next = {
    ...next,
    businesses: next.businesses.map((business) =>
      business.id === employee.businessId
        ? {
            ...business,
            expenses: business.expenses + plan.cost,
            otherExpenses: business.otherExpenses + plan.cost,
          }
        : business,
    ),
  };
  return updateEmployee(next, employeeId, (current) =>
    addHistory(
      {
        ...current,
        training: {
          level,
          startedAt: { ...state.date },
          completesAt: addCalendarDays(state.date, plan.days),
          skillGain: plan.skillGain,
          efficiencyGain: plan.efficiencyGain,
          cost: plan.cost,
        },
      },
      state,
      "TRAINING_STARTED",
      `${level} training started (${plan.days} days)`,
    ),
  );
}

export function fireEmployee(state: GameState, employeeId: string): GameState {
  const employee = state.staff.employees.find((x) => x.id === employeeId);
  if (!employee) throw new Error("Employee not found");
  const fired = addHistory(
    { ...employee, employmentStatus: "FIRED" },
    state,
    "FIRED",
    "Employment ended",
  );
  return {
    ...state,
    staff: {
      ...state.staff,
      employees: state.staff.employees.filter((x) => x.id !== employeeId),
      terminatedEmployees: [fired, ...state.staff.terminatedEmployees],
    },
    businesses: state.businesses.map((business) => {
      if (business.id !== employee.businessId) return business;
      const delegations = business.management.delegations.map((assignment) =>
        assignment.employeeId === employeeId
          ? { task: assignment.task, mode: "SELF" as const }
          : assignment,
      );
      const lostManager = business.management.managerId === employeeId;
      return {
        ...business,
        management: {
          ...business.management,
          delegations,
          managerId: lostManager ? undefined : business.management.managerId,
          mode: lostManager && business.management.mode === "FULLY_MANAGED"
            ? "PARTIALLY_DELEGATED"
            : business.management.mode,
          automationEfficiency: 0,
        },
      };
    }),
  };
}

export function assignTask(
  state: GameState,
  businessId: string,
  task: StaffTask,
  mode: "SELF" | "EMPLOYEE" | "MANAGER",
  employeeId?: string,
): GameState {
  const business = state.businesses.find((x) => x.id === businessId);
  if (!business) throw new Error("Business not found");
  if (mode !== "SELF") {
    const employee = state.staff.employees.find(
      (x) => x.id === employeeId && x.businessId === businessId,
    );
    if (!employee) throw new Error("Select an active employee");
    const managerRole = ["TEAM_LEADER", "BUSINESS_MANAGER", "GENERAL_MANAGER", "SALES_MANAGER", "DEALERSHIP_MANAGER", "INVENTORY_MANAGER"].includes(employee.role);
    if (mode === "MANAGER" && !managerRole)
      throw new Error("This task requires a manager");
    if (mode === "EMPLOYEE" && !ROLE_TASKS[employee.role].includes(task))
      throw new Error("Employee role does not support this task");
  }
  const next = {
    ...state,
    businesses: state.businesses.map((item) =>
      item.id === businessId
        ? {
            ...item,
            management: {
              ...item.management,
              delegations: item.management.delegations.map((assignment) =>
                assignment.task === task
                  ? { task, mode, employeeId: mode === "SELF" ? undefined : employeeId }
                  : assignment,
              ),
              mode: mode === "SELF" && item.management.delegations.every(
                (assignment) => assignment.task === task || assignment.mode === "SELF",
              )
                ? ("SELF_MANAGED" as const)
                : ("PARTIALLY_DELEGATED" as const),
            },
          }
        : item,
    ),
  };
  return refreshAutomation(next, businessId);
}

export function setManagementMode(
  state: GameState,
  businessId: string,
  mode: ManagementMode,
  managerId?: string,
): GameState {
  const manager = managerId
    ? state.staff.employees.find((x) => x.id === managerId && x.businessId === businessId)
    : undefined;
  if (mode === "FULLY_MANAGED" && (!manager || !["BUSINESS_MANAGER", "GENERAL_MANAGER", "DEALERSHIP_MANAGER"].includes(manager.role)))
    throw new Error("Full management requires a Business or General Manager");
  let next: GameState = {
    ...state,
    staff: {
      ...state.staff,
      employees: state.staff.employees.map((employee) =>
        employee.businessId === businessId && employee.id !== managerId
          ? {
              ...employee,
              managerId:
                mode === "FULLY_MANAGED"
                  ? managerId
                  : mode === "SELF_MANAGED"
                    ? undefined
                    : employee.managerId,
            }
          : employee,
      ),
    },
    businesses: state.businesses.map((business) =>
      business.id === businessId
        ? {
            ...business,
            management: {
              ...business.management,
              mode,
              managerId: mode === "SELF_MANAGED" ? undefined : managerId ?? business.management.managerId,
              delegations:
                mode === "SELF_MANAGED"
                  ? business.management.delegations.map((x) => ({ task: x.task, mode: "SELF" as const }))
                  : mode === "FULLY_MANAGED"
                    ? business.management.delegations.map((x) => ({ task: x.task, mode: "MANAGER" as const, employeeId: managerId }))
                    : business.management.delegations,
            },
          }
        : business,
    ),
  };
  next = refreshAutomation(next, businessId);
  return next;
}

export function calculateAutomationEfficiency(
  state: GameState,
  businessId: string,
): number {
  const business = state.businesses.find((x) => x.id === businessId);
  if (!business || business.management.mode === "SELF_MANAGED") return 0;
  const delegated = business.management.delegations.filter((x) => x.mode !== "SELF");
  if (!delegated.length) return 0;
  const scores = delegated.map((assignment) => {
    const employee = state.staff.employees.find((x) => x.id === assignment.employeeId);
    if (!employee) return 0;
    const base = employee.performance * 0.55 + employee.skill * 0.2 + employee.reliability * 0.1 + employee.morale * 0.05 + employee.leadership * (assignment.mode === "MANAGER" ? 0.1 : 0.03);
    return clamp(base, 55, 98);
  });
  const quality = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const coverage = delegated.length / Math.max(1, business.management.delegations.length);
  return Math.round(clamp(quality * (business.management.mode === "FULLY_MANAGED" ? 0.98 : 0.75 + coverage * 0.2), 0, 98));
}

const refreshAutomation = (state: GameState, businessId: string): GameState => {
  const score = calculateAutomationEfficiency(state, businessId);
  return {
    ...state,
    businesses: state.businesses.map((business) =>
      business.id === businessId
        ? { ...business, management: { ...business.management, automationEfficiency: score } }
        : business,
    ),
  };
};

function processSalary(state: GameState, employee: Employee): GameState {
  const due = employee.contractData.monthlySalary + employee.contractData.overdueAmount;
  const paid = Math.min(state.cash, due);
  let next = state;
  if (paid > 0) {
    next = transact(next, "BUSINESS_EXPENSE", paid, `Salary: ${employee.firstName} ${employee.lastName}`, employee.id);
    next = {
      ...next,
      businesses: next.businesses.map((business) =>
        business.id === employee.businessId
          ? { ...business, expenses: business.expenses + paid, salaryExpenses: business.salaryExpenses + paid }
          : business,
      ),
    };
  }
  const overdue = Math.round((due - paid) * 100) / 100;
  return updateEmployee(next, employee.id, (current) =>
    addHistory(
      {
        ...current,
        morale: clamp(current.morale + (overdue ? -15 : 2)),
        loyalty: clamp(current.loyalty + (overdue ? -8 : 1)),
        contractData: {
          ...current.contractData,
          nextPayDate: addCalendarDays(current.contractData.nextPayDate, 30),
          overdueAmount: overdue,
          lastPaidDate: paid ? { ...state.date } : current.contractData.lastPaidDate,
        },
      },
      state,
      overdue ? "SALARY_OVERDUE" : "SALARY_PAID",
      overdue ? `€${overdue} salary overdue` : `€${paid} salary paid`,
    ),
  );
}

function processAutomation(state: GameState, businessId: string): GameState {
  const business = state.businesses.find((x) => x.id === businessId);
  if (!business || business.type !== "RESELLING" || !business.management.automationEfficiency) return state;
  const assignment = (task: StaffTask) =>
    business.management.delegations.find((x) => x.task === task && x.mode !== "SELF");
  let next = state;
  const buying = assignment("BUYING") ?? assignment("PRODUCT_SOURCING");
  if (buying && (!business.management.lastAutoBuyDate || dateDistance(business.management.lastAutoBuyDate, state.date) >= 3)) {
    const employee = state.staff.employees.find((x) => x.id === buying.employeeId);
    if (employee) {
      const offers = [...MARKET_OFFERS].sort((a, b) => {
        const score = (offer: (typeof MARKET_OFFERS)[number]) =>
          (offer.marketValue - offer.purchasePrice) / offer.purchasePrice +
          (offer.demand === "High" ? 0.18 : offer.demand === "Low" ? -0.08 : 0);
        return score(b) - score(a);
      });
      const choice = offers[Math.min(offers.length - 1, employee.skill < 60 ? 2 : employee.skill < 78 ? 1 : 0)];
      const salaryReserve = state.staff.employees.filter((x) => x.businessId === businessId).reduce((sum, x) => sum + x.salary, 0);
      if (choice && next.cash - choice.purchasePrice >= salaryReserve * 0.5) {
        next = buyItem(next, { ...choice, id: `${choice.id}-auto-${state.date.year}-${state.date.month}-${state.date.day}` });
        next = {
          ...next,
          businesses: next.businesses.map((x) => x.id === businessId ? { ...x, management: { ...x.management, lastAutoBuyDate: { ...state.date } } } : x),
        };
      }
    }
  }
  const listing = assignment("LISTING") ?? assignment("PRICING_ASSISTANCE");
  if (listing) {
    const employee = next.staff.employees.find((x) => x.id === listing.employeeId);
    const current = next.businesses.find((x) => x.id === businessId)!;
    const unlisted = current.inventory.find((x) => !x.listedPrice);
    if (employee && unlisted) {
      const premium = 0.95 + employee.skill / 1000;
      next = listItem(next, unlisted.id, Math.round(unlisted.marketValue * premium));
      next = {
        ...next,
        businesses: next.businesses.map((x) => x.id === businessId ? { ...x, management: { ...x.management, lastAutoListDate: { ...state.date } } } : x),
      };
    }
  }
  return next;
}

export function processEmployeesDay(state: GameState): GameState {
  let next = state;
  const snapshot = [...next.staff.employees];
  for (const original of snapshot) {
    let employee = next.staff.employees.find((x) => x.id === original.id);
    if (!employee) continue;
    if (dateDistance(employee.contractData.nextPayDate, next.date) >= 0) {
      next = processSalary(next, employee);
      employee = next.staff.employees.find((x) => x.id === original.id)!;
    }
    next = updateEmployee(next, employee.id, (current) => {
      const assignments = next.businesses
        .find((business) => business.id === current.businessId)
        ?.management.delegations.filter(
          (assignment) => assignment.employeeId === current.id,
        ).length ?? 0;
      const manager = current.managerId
        ? next.staff.employees.find((item) => item.id === current.managerId)
        : undefined;
      const managerMorale = manager
        ? manager.leadership >= 80
          ? 0.05
          : manager.leadership < 55
            ? -0.1
            : 0
        : 0;
      let updated = {
        ...current,
        experience: Math.round((current.experience + 1 / 365) * 1000) / 1000,
        workload: clamp(assignments * 22),
        morale: clamp(
          current.morale - (assignments >= 5 ? 0.25 : 0) + managerMorale,
        ),
      };
      if (updated.training && dateDistance(updated.training.completesAt, next.date) >= 0) {
        const training = updated.training;
        updated = addHistory(
          {
            ...updated,
            skill: clamp(updated.skill + training.skillGain),
            efficiency: clamp(updated.efficiency + training.efficiencyGain),
            leadership: clamp(updated.leadership + (training.level === "LEADERSHIP" ? 7 : 0)),
            morale: clamp(updated.morale + 4),
            training: undefined,
          },
          next,
          "TRAINING_COMPLETED",
          `${training.level} training completed`,
        );
      }
      return { ...updated, performance: calculatePerformance(updated, manager) };
    });
  }
  if (next.date.day === 1 && (next.staff.lastCandidateRefresh.month !== next.date.month || next.staff.lastCandidateRefresh.year !== next.date.year)) {
    const generation = next.staff.candidateGeneration + 1;
    next = { ...next, staff: { ...next.staff, candidates: generateCandidates(next.date, generation), candidateGeneration: generation, lastCandidateRefresh: { ...next.date } } };
  }
  for (const business of next.businesses) {
    next = refreshAutomation(next, business.id);
    next = processAutomation(next, business.id);
  }
  return next;
}

export function debugSpawnCandidates(state: GameState): GameState {
  if (state.mode !== "TEST") throw new Error("Debug staff tools require the test save");
  const generation = state.staff.candidateGeneration + 1;
  return { ...state, staff: { ...state.staff, candidates: generateCandidates(state.date, generation), candidateGeneration: generation, lastCandidateRefresh: { ...state.date } } };
}

export function debugHireEliteManager(state: GameState): GameState {
  if (state.mode !== "TEST") throw new Error("Debug staff tools require the test save");
  const candidate: EmployeeCandidate = { id: makeId("debug-candidate"), firstName: "Alex", lastName: "Vanguard", age: 39, role: "GENERAL_MANAGER", salaryExpectation: 20000, experience: 15, skill: 100, efficiency: 100, reliability: 100, loyalty: 100, morale: 100, leadership: 100, traits: ["LOYAL", "ORGANIZED", "NEGOTIATOR"] };
  let next = { ...state, staff: { ...state.staff, candidates: [candidate, ...state.staff.candidates] } };
  next = hireEmployee(next, candidate.id);
  const employee = next.staff.employees[next.staff.employees.length - 1];
  next = updateEmployee(next, employee.id, (current) => addHistory(current, next, "DEBUG", "DEBUG: Elite General Manager created"));
  return next;
}

export function debugMaxStaff(state: GameState): GameState {
  if (state.mode !== "TEST") throw new Error("Debug staff tools require the test save");
  return {
    ...state,
    staff: {
      ...state.staff,
      employees: state.staff.employees.map((employee) => ({ ...employee, skill: 100, efficiency: 100, reliability: 100, morale: 100, performance: 100, history: [{ id: makeId("staff-history"), type: "DEBUG", gameDate: { ...state.date }, description: "DEBUG: Skills and morale maximized" }, ...employee.history] })),
    },
  };
}
