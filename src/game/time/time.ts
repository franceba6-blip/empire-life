import { GameDate } from '@/models/game';

export const dateKey = (d: GameDate) => `${d.year}-${String(d.month).padStart(2, '0')}`;
export const formatGameDate = (d: GameDate) => `${String(d.day).padStart(2, '0')}.${String(d.month).padStart(2, '0')}.${d.year}`;
export function addDays(date: GameDate, days: number): GameDate {
  const value = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1, day: value.getUTCDate() };
}
export const ageAt = (birthYear: number, date: GameDate) => date.year - birthYear;
