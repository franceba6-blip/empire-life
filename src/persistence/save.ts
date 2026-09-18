import AsyncStorage from "@react-native-async-storage/async-storage";
import { START_HOUR } from "@/config/balance";
import { createDefaultFamily } from "@/game/relationships/defaultFamily";
import { initialRealEstate } from "@/game/realEstate/realEstate";
import { GameState } from "@/models/game";
import {
  defaultManagement,
  initialStaffState,
} from "@/game/employees/employees";
export const SAVE_KEY = "empire-life.save.v1";
export const TEST_SAVE_KEY = "empire-life.test.v1";
export type SaveSlot = "NORMAL" | "TEST";
export function migrateGameState(input: unknown): GameState {
  if (!input || typeof input !== "object") throw new Error("Invalid save");
  const parsed = input as Record<string, unknown>;
  if (![1, 2, 3, 4].includes(Number(parsed.schemaVersion)))
    throw new Error("Unsupported save version");
  if (
    !parsed.player ||
    !parsed.date ||
    !Array.isArray(parsed.transactions) ||
    typeof parsed.cash !== "number" ||
    !Number.isFinite(parsed.cash)
  )
    throw new Error("Incomplete save");
  let state = parsed as unknown as GameState;
  if (parsed.schemaVersion === 1) {
    const old = (
      parsed.relationships as
        | Array<{
            id: string;
            name: string;
            type: string;
            trust: number;
            lastAskedMonth?: string;
          }>
        | undefined
    )?.find((x) => x.type === "BROTHER");
    state = {
      ...state,
      hour: START_HOUR,
      familyEvents: [],
      relationships: createDefaultFamily().map((m) =>
        m.relationType === "BROTHER" && old
          ? {
              ...m,
              id: old.id || m.id,
              name: old.name || m.name,
              trust: old.trust,
              relationshipScore: old.trust,
              lastAskedMonth: old.lastAskedMonth,
            }
          : m,
      ),
    };
  }
  return {
    ...state,
    schemaVersion: 4,
    mode: state.mode === "TEST" ? "TEST" : "NORMAL",
    realEstate: state.realEstate ?? initialRealEstate(state.date),
    staff: state.staff ?? initialStaffState(state.date),
    businesses: (state.businesses ?? []).map((business) => ({
      ...business,
      productCosts: business.productCosts ?? business.expenses ?? 0,
      salaryExpenses: business.salaryExpenses ?? 0,
      otherExpenses: business.otherExpenses ?? 0,
      management: business.management ?? defaultManagement(),
    })),
  };
}
export const saveKeyFor = (slot: SaveSlot) =>
  slot === "TEST" ? TEST_SAVE_KEY : SAVE_KEY;
// Serialize writes so a slow old save can never overwrite a newer one.
let writes: Promise<void> = Promise.resolve();
export function saveGame(state: GameState): Promise<void> {
  const key = saveKeyFor(state.mode),
    json = JSON.stringify(state);
  writes = writes.catch(() => {}).then(() => AsyncStorage.setItem(key, json));
  return writes;
}
export async function loadGame(
  slot: SaveSlot = "NORMAL",
): Promise<GameState | null> {
  await writes.catch(() => {});
  const raw = await AsyncStorage.getItem(saveKeyFor(slot));
  if (!raw) return null;
  const migrated = migrateGameState(JSON.parse(raw));
  if (migrated.mode !== slot) throw new Error("Save slot mismatch");
  return migrated;
}
export async function resetSave(slot: SaveSlot = "NORMAL") {
  await writes.catch(() => {});
  await AsyncStorage.removeItem(saveKeyFor(slot));
}
