import AsyncStorage from '@react-native-async-storage/async-storage';
import { START_HOUR } from '@/config/balance';
import { createDefaultFamily } from '@/game/relationships/defaultFamily';
import { GameState } from '@/models/game';

export const SAVE_KEY = 'empire-life.save.v1';
type LegacySave = Omit<GameState, 'schemaVersion' | 'hour' | 'relationships' | 'familyEvents'> & { schemaVersion: 1; relationships?: Array<{ id: string; name: string; type: 'BROTHER'; trust: number; lastAskedMonth?: string }> };

export function migrateGameState(input: unknown): GameState {
  const parsed = input as Partial<GameState> & { schemaVersion?: number };
  if (parsed.schemaVersion === 2) return parsed as GameState;
  if (parsed.schemaVersion !== 1) throw new Error('Unsupported save version');
  const legacy = parsed as unknown as LegacySave;
  const oldBrother = legacy.relationships?.find(item => item.type === 'BROTHER');
  const relationships = createDefaultFamily().map(member => member.relationType === 'BROTHER' && oldBrother ? { ...member, id: oldBrother.id || member.id, name: oldBrother.name || member.name, trust: oldBrother.trust, relationshipScore: oldBrother.trust, lastAskedMonth: oldBrother.lastAskedMonth } : member);
  return { ...legacy, schemaVersion: 2, hour: START_HOUR, relationships, familyEvents: [] } as GameState;
}

export const saveGame = async (state: GameState) => AsyncStorage.setItem(SAVE_KEY, JSON.stringify(state));
export const loadGame = async (): Promise<GameState | null> => {
  const raw = await AsyncStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  const rawState = JSON.parse(raw) as { schemaVersion?: number };
  const migrated = migrateGameState(rawState);
  if (rawState.schemaVersion !== 2) await saveGame(migrated);
  return migrated;
};
export const resetSave = async () => AsyncStorage.removeItem(SAVE_KEY);
