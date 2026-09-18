import { create } from "zustand";
import { GameState } from "@/models/game";
import { createGame } from "@/game/createGame";
import { loadGame, resetSave, saveGame } from "@/persistence/save";
import { JOBS } from "@/config/balance";
import { transact } from "@/game/economy/economy";
import { advanceGameTime } from "@/game/time/time";

interface Store {
  game: GameState | null;
  hydrated: boolean;
  activeSlot: "NORMAL" | "TEST";
  switchMode: (mode: "NORMAL" | "TEST") => Promise<void>;
  hydrate: () => Promise<void>;
  newGame: (first: string, last: string) => Promise<void>;
  update: (fn: (game: GameState) => GameState) => void;
  work: (jobId: string) => { reward: number; hours: number };
  advanceDay: () => void;
  reset: () => Promise<void>;
}

export const useGameStore = create<Store>((set, get) => ({
  game: null,
  hydrated: false,
  activeSlot: "NORMAL",
  hydrate: async () => set({ game: await loadGame(), hydrated: true }),
  newGame: async (first, last) => {
    const game = { ...createGame(first, last), mode: get().activeSlot };
    await saveGame(game);
    set({ game });
  },
  update: (fn) => {
    const game = get().game;
    if (!game) return;
    const next = fn(game);
    set({ game: next });
    void saveGame(next);
  },
  work: (jobId) => {
    const job = JOBS.find((j) => j.id === jobId)!;
    const reward = Math.round(
      job.minReward + Math.random() * (job.maxReward - job.minReward),
    );
    get().update((game) => {
      let next = transact(game, "JOB_INCOME", reward, job.name);
      next = advanceGameTime(next, job.timeHours);
      return {
        ...next,
        stats: { ...next.stats, jobsCompleted: next.stats.jobsCompleted + 1 },
      };
    });
    return { reward, hours: job.timeHours };
  },
  advanceDay: () => get().update((game) => advanceGameTime(game, 24)),
  switchMode: async (mode) => {
    const current = get().game;
    if (!current) return;
    await saveGame(current);
    let game = await loadGame(mode);
    if (!game && mode === "NORMAL")
      throw new Error(
        "Normal save missing; refusing to overwrite it with test progress",
      );
    if (!game) {
      game = JSON.parse(JSON.stringify(current)) as GameState;
      game.mode = mode;
      await saveGame(game);
    }
    set({ game, activeSlot: mode });
  },
  reset: async () => {
    await resetSave(get().activeSlot);
    set({ game: null });
  },
}));
