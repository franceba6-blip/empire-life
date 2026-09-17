import { FAMILY_INTERACTIONS, GIFTS } from '@/config/balance';
import { transact } from '@/game/economy/economy';
import { advanceGameTime, addDays, dateKey, daysBetween } from '@/game/time/time';
import { FamilyMember, FinancialRecord, GameState, GiftTier, InteractionType, Mood, PersonMemory } from '@/models/game';
import { makeId } from '@/utils/id';

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const moodFrom = (value: number): Mood => value >= 7 ? 'Happy' : value >= 3 ? 'Good' : value <= -4 ? 'Hurt' : value < 0 ? 'Worried' : 'Neutral';
const memory = (type: PersonMemory['type'], text: string, date: GameState['date'], importance: 1 | 2 | 3 = 1, metadata?: PersonMemory['metadata']): PersonMemory => ({ id: makeId('memory'), type, gameDate: date, importance, text, metadata });
const replaceMember = (state: GameState, member: FamilyMember): GameState => ({ ...state, relationships: state.relationships.map(item => item.id === member.id ? member : item) });
const getMember = (state: GameState, memberId: string) => {
  const member = state.relationships.find(item => item.id === memberId);
  if (!member) throw new Error('Family member not found');
  return member;
};

export function performInteraction(state: GameState, memberId: string, type: InteractionType): GameState {
  const member = getMember(state, memberId);
  const config = FAMILY_INTERACTIONS[type];
  const previous = member.interactionHistory.find(item => item.type === type);
  if (previous) {
    const elapsed = daysBetween(previous.gameDate, state.date) * 24 + state.hour - previous.gameHour;
    if (elapsed < config.cooldownHours) throw new Error(`${config.label} is on cooldown.`);
  }
  let next = state;
  if (config.cost > 0) next = transact(next, 'FAMILY_HELP', config.cost, `${config.label} with ${member.name}`, member.id);
  next = advanceGameTime(next, config.timeHours);
  const effect = Math.max(1, Math.round(config.relationship * (member.relationshipScore > 90 ? 0.5 : 1)));
  const updated = {
    ...getMember(next, memberId), relationshipScore: clamp(member.relationshipScore + effect), trust: clamp(member.trust + Math.ceil(effect / 3)),
    mood: moodFrom(config.mood), contactStatus: 'active' as const, lastInteractionGameDate: next.date, lastDecayGameDate: next.date,
    interactionHistory: [{ id: makeId('interaction'), type, gameDate: next.date, gameHour: next.hour, cost: config.cost, timeHours: config.timeHours, relationshipEffect: effect, moodEffect: config.mood }, ...member.interactionHistory],
    memories: [memory(type === 'CALL' ? 'CALLED' : type === 'VISIT' ? 'VISITED' : 'ACTIVITY', type === 'CALL' ? 'You called me.' : type === 'VISIT' ? 'You visited me.' : `We enjoyed ${config.label.toLowerCase()}.`, next.date, type === 'PARTY' ? 3 : 1), ...member.memories]
  };
  return rememberBirthday(replaceMember(next, updated), memberId);
}

export function purchaseGift(state: GameState, memberId: string, tier: GiftTier): GameState {
  const member = getMember(state, memberId);
  const gift = GIFTS[tier];
  let next = transact(state, 'FAMILY_GIFT', gift.cost, `${gift.label} gift for ${member.name}`, member.id);
  next = advanceGameTime(next, 1);
  const recentSameTier = member.giftHistory.filter(item => item.tier === tier && daysBetween(item.gameDate, state.date) <= 90).length;
  const preference = member.giftPreferences.includes(tier) ? 1.25 : tier === 'LUXURY' && member.personality === 'sentimental' ? 0.55 : tier === 'LUXURY' && member.personality === 'status' ? 1.3 : 0.85;
  const diminishing = Math.max(0.2, 1 - recentSameTier * 0.25);
  const saturation = member.relationshipScore > 90 ? 0.55 : 1;
  const effect = Math.max(1, Math.round(gift.baseEffect * preference * diminishing * saturation));
  const updated = {
    ...getMember(next, memberId), relationshipScore: clamp(member.relationshipScore + effect), mood: moodFrom(effect), contactStatus: 'active' as const,
    lastInteractionGameDate: next.date, lastDecayGameDate: next.date,
    giftHistory: [{ id: makeId('gift'), tier, itemName: gift.itemName, cost: gift.cost, gameDate: next.date, relationshipEffect: effect }, ...member.giftHistory],
    memories: [memory('GIFT', `You gave me a ${gift.label.toLowerCase()} gift.`, next.date, tier === 'LUXURY' ? 3 : 1, { tier, cost: gift.cost }), ...member.memories]
  };
  return rememberBirthday(replaceMember(next, updated), memberId);
}

export function giveFinancialHelp(state: GameState, memberId: string, amount: number, kind: 'GIFT' | 'LOAN', dueDate?: GameState['date']): GameState {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a valid amount');
  const member = getMember(state, memberId);
  let next = transact(state, 'FAMILY_HELP', amount, `${kind === 'LOAN' ? 'Personal loan' : 'Financial help'} for ${member.name}`, member.id);
  next = advanceGameTime(next, 1);
  const record: FinancialRecord = { id: makeId('family_finance'), direction: 'TO_FAMILY', kind, amount, gameDate: next.date, dueDate: kind === 'LOAN' ? dueDate ?? addDays(next.date, 30) : undefined, status: kind === 'LOAN' ? 'ACTIVE' : 'GIVEN' };
  const effect = kind === 'GIFT' ? Math.min(8, 2 + Math.floor(amount / 500)) : Math.min(5, 1 + Math.floor(amount / 1000));
  const updated = { ...getMember(next, memberId), relationshipScore: clamp(member.relationshipScore + effect), trust: clamp(member.trust + effect), mood: 'Happy' as const, financialHistory: [record, ...member.financialHistory], memories: [memory('FINANCIAL_HELP', `You helped me with €${amount.toLocaleString()}.`, next.date, amount >= 2000 ? 3 : 2, { amount, kind }), ...member.memories] };
  return replaceMember(next, updated);
}

function rememberBirthday(state: GameState, memberId: string): GameState {
  const event = state.familyEvents.find(item => item.memberId === memberId && item.type === 'BIRTHDAY' && item.status === 'OPEN');
  if (!event) return state;
  const member = getMember(state, memberId);
  return {
    ...replaceMember(state, { ...member, memories: [memory('BIRTHDAY_REMEMBERED', 'You remembered my birthday.', state.date, 2), ...member.memories] }),
    familyEvents: state.familyEvents.map(item => item.id === event.id ? { ...item, status: 'ACCEPTED', decisionGameDate: state.date } : item)
  };
}

export function respondToFamilyEvent(state: GameState, eventId: string, decision: 'ACCEPTED' | 'DECLINED' | 'IGNORED'): GameState {
  const event = state.familyEvents.find(item => item.id === eventId);
  if (!event || event.status !== 'OPEN') throw new Error('Event is no longer available');
  let next = { ...state, familyEvents: state.familyEvents.map(item => item.id === eventId ? { ...item, status: decision, decisionGameDate: state.date } : item) };
  if (decision !== 'ACCEPTED') {
    const member = getMember(next, event.memberId);
    next = replaceMember(next, { ...member, relationshipScore: clamp(member.relationshipScore - (decision === 'IGNORED' ? 2 : 1)), memories: [memory('HELP_REFUSED', decision === 'IGNORED' ? 'My request was ignored.' : 'You could not help this time.', state.date, 1), ...member.memories] });
  }
  return next;
}

export function askBrother(state: GameState, amount: number, roll = Math.random()): { state: GameState; approved: boolean; message: string } {
  const brother = state.relationships.find(item => item.relationType === 'BROTHER')!;
  if (brother.lastAskedMonth === dateKey(state.date)) return { state, approved: false, message: `${brother.name} needs space. Try again next month.` };
  const chance = Math.max(0.08, Math.min(0.9, brother.trust / 100 - amount / 10000));
  const asked = { ...brother, lastAskedMonth: dateKey(state.date), trust: clamp(brother.trust - 4) };
  let next = replaceMember(state, asked);
  if (roll > chance) return { state: next, approved: false, message: `${brother.name} cannot help this time.` };
  const id = makeId('personal_debt');
  next = transact(next, 'FAMILY_LOAN_RECEIVED', amount, `Loan from ${brother.name}`, id);
  const record: FinancialRecord = { id, direction: 'TO_PLAYER', kind: 'LOAN', amount, gameDate: state.date, status: 'ACTIVE' };
  next = { ...next, personalDebts: [...next.personalDebts, { id, creditorId: brother.id, creditorName: brother.name, amount, repaidAmount: 0, createdAt: state.date, status: 'ACTIVE' }], relationships: next.relationships.map(item => item.id === brother.id ? { ...item, financialHistory: [record, ...item.financialHistory] } : item) };
  return { state: next, approved: true, message: `${brother.name} lent you €${amount.toLocaleString()}. Pay him back.` };
}

export function repayBrother(state: GameState, debtId: string, amount: number): GameState {
  const debt = state.personalDebts.find(item => item.id === debtId);
  if (!debt) throw new Error('Debt not found');
  const paid = Math.min(amount, debt.amount - debt.repaidAmount);
  let next = transact(state, 'FAMILY_LOAN_REPAYMENT', paid, `Repaid ${debt.creditorName}`, debtId);
  next = { ...next, personalDebts: next.personalDebts.map(item => item.id === debtId ? { ...item, repaidAmount: item.repaidAmount + paid, status: item.repaidAmount + paid >= item.amount ? 'REPAID' : 'ACTIVE' } : item), relationships: next.relationships.map(item => item.id === debt.creditorId ? { ...item, trust: clamp(item.trust + 3), relationshipScore: clamp(item.relationshipScore + 2), memories: [memory('DEBT_REPAID', `You repaid €${paid.toLocaleString()}.`, state.date, 2), ...item.memories], financialHistory: item.financialHistory.map(record => record.id === debtId && paid >= debt.amount - debt.repaidAmount ? { ...record, status: 'REPAID' } : record) } : item) };
  return next;
}
