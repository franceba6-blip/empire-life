import { create } from 'zustand';
import { GameState } from '@/models/game';
import { createGame } from '@/game/createGame';
import { loadGame, resetSave, saveGame } from '@/persistence/save';
import { JOBS } from '@/config/balance';
import { transact } from '@/game/economy/economy';
import { addDays } from '@/game/time/time';
import { resolveSales } from '@/game/businesses/reselling';

interface Store {
  game: GameState | null; hydrated: boolean;
  hydrate: () => Promise<void>; newGame: (first: string, last: string) => Promise<void>;
  update: (fn: (game: GameState) => GameState) => void;
  work: (jobId: string) => void; advanceDay: () => void; reset: () => Promise<void>;
}

export const useGameStore = create<Store>((set, get) => ({
  game: null, hydrated: false,
  hydrate: async () => set({ game: await loadGame(), hydrated: true }),
  newGame: async (first, last) => { const game = createGame(first, last); await saveGame(game); set({ game }); },
  update: fn => { const game = get().game; if (!game) return; const next = fn(game); set({ game: next }); void saveGame(next); },
  work: jobId => get().update(game => { const job = JOBS.find(j => j.id === jobId)!; const reward = Math.round(job.minReward + Math.random() * (job.maxReward - job.minReward)); let next = transact(game, 'JOB_INCOME', reward, job.name); next = { ...next, date: addDays(next.date, job.durationDays), stats: { ...next.stats, jobsCompleted: next.stats.jobsCompleted + 1 } }; return resolveSales(next); }),
  advanceDay: () => get().update(game => resolveSales({ ...game, date: addDays(game.date, 1) })),
  reset: async () => { await resetSave(); set({ game: null }); }
}));
