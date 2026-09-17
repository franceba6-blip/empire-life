import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState } from '@/models/game';

export const SAVE_KEY = 'empire-life.save.v1';
export const saveGame = async (state: GameState) => AsyncStorage.setItem(SAVE_KEY, JSON.stringify(state));
export const loadGame = async (): Promise<GameState | null> => {
  const raw = await AsyncStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as GameState;
  if (parsed.schemaVersion !== 1) throw new Error('Unsupported save version');
  return parsed;
};
export const resetSave = async () => AsyncStorage.removeItem(SAVE_KEY);
