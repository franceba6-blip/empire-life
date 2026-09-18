import { initialRealEstate } from "@/game/realEstate/realEstate";
import { START_DATE, START_HOUR } from "@/config/balance";
import { createDefaultFamily } from "@/game/relationships/defaultFamily";
import { GameState } from "@/models/game";
import { makeId } from "@/utils/id";
import {
  defaultManagement,
  initialStaffState,
} from "@/game/employees/employees";

export const createGame = (
  firstName: string,
  lastName: string,
  age = 18,
): GameState => ({
  schemaVersion: 4,
  mode: "NORMAL",
  realEstate: initialRealEstate(START_DATE),
  player: {
    id: makeId("player"),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    ageAtStart: age,
    birthYear: START_DATE.year - age,
  },
  date: { ...START_DATE },
  hour: START_HOUR,
  cash: 0,
  transactions: [],
  loans: [],
  personalDebts: [],
  creditScore: 512,
  relationships: createDefaultFamily(),
  familyEvents: [],
  staff: initialStaffState(START_DATE),
  businesses: [
    {
      id: "reselling",
      type: "RESELLING",
      name: "Reselling",
      inventory: [],
      sales: [],
      cashInvested: 0,
      revenue: 0,
      expenses: 0,
      productCosts: 0,
      salaryExpenses: 0,
      otherExpenses: 0,
      management: defaultManagement(),
    },
  ],
  stats: { jobsCompleted: 0, itemsSold: 0, lifetimeIncome: 0 },
  settings: { haptics: true },
});
