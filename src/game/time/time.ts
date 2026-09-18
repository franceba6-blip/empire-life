import { processPropertyDay } from "@/game/realEstate/realEstate";
import { RELATIONSHIP_DECAY } from "@/config/balance";
import { resolveSales } from "@/game/businesses/reselling";
import {
  FamilyEvent,
  FamilyMember,
  GameDate,
  GameState,
  PersonMemory,
} from "@/models/game";
import { makeId } from "@/utils/id";
import { processEmployeesDay } from "@/game/employees/employees";

export const dateKey = (d: GameDate) =>
  `${d.year}-${String(d.month).padStart(2, "0")}`;
export const formatGameDate = (d: GameDate) =>
  `${String(d.day).padStart(2, "0")}.${String(d.month).padStart(2, "0")}.${d.year}`;
export const formatGameTime = (state: Pick<GameState, "date" | "hour">) =>
  `${formatGameDate(state.date)} · ${String(state.hour).padStart(2, "0")}:00`;
export function addDays(date: GameDate, days: number): GameDate {
  const value = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
  };
}
export const ageAt = (birthYear: number, date: GameDate) =>
  date.year - birthYear;
export function daysBetween(from: GameDate, to: GameDate): number {
  const a = Date.UTC(from.year, from.month - 1, from.day);
  const b = Date.UTC(to.year, to.month - 1, to.day);
  return Math.floor((b - a) / 86_400_000);
}
export const relationLabel = (score: number) =>
  score >= 85
    ? "Excellent"
    : score >= 70
      ? "Good"
      : score >= 50
        ? "Stable"
        : score >= 30
          ? "Strained"
          : "Poor";

const inactivityMemory = (
  member: FamilyMember,
  date: GameDate,
): PersonMemory[] => {
  if (
    member.memories.some(
      (m) => m.type === "INACTIVE" && daysBetween(m.gameDate, date) < 60,
    )
  )
    return member.memories;
  return [
    {
      id: makeId("memory"),
      type: "INACTIVE",
      gameDate: date,
      importance: 2,
      text: "We have not spoken for a long time.",
    },
    ...member.memories,
  ];
};

function processFamilyDay(state: GameState, date: GameDate): GameState {
  let events = [...state.familyEvents];
  let members = state.relationships.map((member) => {
    const birthdayId = `birthday-${member.id}-${date.year}`;
    if (
      member.birthday.month === date.month &&
      member.birthday.day === date.day &&
      !events.some((e) => e.id === birthdayId)
    ) {
      events.push({
        id: birthdayId,
        type: "BIRTHDAY",
        memberId: member.id,
        title: `${member.name}'s birthday`,
        description: "Call, visit, give a gift or organize a celebration.",
        gameDate: date,
        status: "OPEN",
      });
    }
    const reference = member.lastInteractionGameDate ?? {
      year: 2026,
      month: 1,
      day: 1,
    };
    const silentDays = Math.max(0, daysBetween(reference, date));
    const sinceDecay = Math.max(0, daysBetween(member.lastDecayGameDate, date));
    const decay =
      silentDays > RELATIONSHIP_DECAY.graceDays
        ? Math.min(
            RELATIONSHIP_DECAY.maxPerAdvance,
            Math.floor(sinceDecay / RELATIONSHIP_DECAY.intervalDays),
          )
        : 0;
    if (!decay && silentDays < RELATIONSHIP_DECAY.distantDays) return member;
    return {
      ...member,
      relationshipScore: Math.max(0, member.relationshipScore - decay),
      mood:
        silentDays >= RELATIONSHIP_DECAY.noContactDays
          ? "Hurt"
          : silentDays >= RELATIONSHIP_DECAY.distantDays
            ? "Worried"
            : member.mood,
      contactStatus:
        silentDays >= RELATIONSHIP_DECAY.noContactDays
          ? "no_contact"
          : silentDays >= RELATIONSHIP_DECAY.distantDays
            ? "distant"
            : "active",
      lastDecayGameDate: decay ? date : member.lastDecayGameDate,
      memories:
        silentDays >= RELATIONSHIP_DECAY.distantDays
          ? inactivityMemory(member, date)
          : member.memories,
    } as FamilyMember;
  });
  if (date.day === 1 && date.month % 2 === 0) {
    const member = members[(date.month / 2 - 1) % members.length];
    const id = `family-request-${date.year}-${date.month}`;
    if (!events.some((e) => e.id === id))
      events.push({
        id,
        type: "VISIT_REQUEST",
        memberId: member.id,
        title: `${member.name} wants to see you`,
        description: "They ask whether you have time for a visit.",
        gameDate: date,
        status: "OPEN",
      });
  }
  const expiredBirthdayIds = new Set(
    events
      .filter(
        (e) =>
          e.type === "BIRTHDAY" &&
          e.status === "OPEN" &&
          daysBetween(e.gameDate, date) > 1,
      )
      .map((e) => e.id),
  );
  if (expiredBirthdayIds.size) {
    events = events.map((e) =>
      expiredBirthdayIds.has(e.id)
        ? { ...e, status: "IGNORED" as const, decisionGameDate: date }
        : e,
    );
    members = members.map((member) => {
      const forgotten = events.some(
        (e) => expiredBirthdayIds.has(e.id) && e.memberId === member.id,
      );
      return forgotten
        ? {
            ...member,
            relationshipScore: Math.max(0, member.relationshipScore - 2),
            memories: [
              {
                id: makeId("memory"),
                type: "BIRTHDAY_FORGOTTEN",
                gameDate: date,
                importance: 2,
                text: "My birthday was forgotten.",
              },
              ...member.memories,
            ],
          }
        : member;
    });
  }
  return { ...state, date, relationships: members, familyEvents: events };
}

export function advanceGameTime(state: GameState, hours: number): GameState {
  if (!Number.isFinite(hours) || hours <= 0)
    throw new Error("Time must be positive");
  const total = state.hour + Math.ceil(hours);
  const days = Math.floor(total / 24);
  let next = { ...state, hour: total % 24 };
  for (let day = 1; day <= days; day += 1) {
    next = processPropertyDay(processFamilyDay(next, addDays(state.date, day)));
    next = processEmployeesDay(next);
  }
  if (!days) next = { ...next, date: state.date };
  return resolveSales(next);
}
