import { describe, expect, it } from 'vitest';
import { createGame } from '../src/game/createGame';
import { transact, netWorth } from '../src/game/economy/economy';
import { monthlyPayment, takeLoan } from '../src/game/economy/loans';
import { askBrother, repayBrother } from '../src/game/relationships/family';
import { giveFinancialHelp, performInteraction, purchaseGift } from '../src/game/relationships/family';
import { buyItem, listItem, resolveSales } from '../src/game/businesses/reselling';
import { addDays, advanceGameTime } from '../src/game/time/time';
import { MARKET_OFFERS } from '../src/config/balance';
import { migrateGameState } from '../src/persistence/save';

describe('economy',()=>{
  it('records income centrally',()=>{const g=transact(createGame('A','B'),'JOB_INCOME',80,'Work');expect(g.cash).toBe(80);expect(g.transactions).toHaveLength(1)});
  it('rejects invalid money',()=>{expect(()=>transact(createGame('A','B'),'JOB_INCOME',Number.NaN,'Bad')).toThrow();expect(()=>transact(createGame('A','B'),'JOB_INCOME',Infinity,'Bad')).toThrow()});
  it('rejects insufficient funds',()=>expect(()=>transact(createGame('A','B'),'BUSINESS_PURCHASE',1,'Buy')).toThrow('Insufficient'));
  it('calculates net worth including debt',()=>{const g=takeLoan(createGame('A','B'),{name:'Micro',principal:1000,apr:8,term:12,minScore:400});expect(netWorth(g)).toBe(0)});
  it('calculates amortized loan payment',()=>expect(monthlyPayment(5000,9.5,24)).toBeCloseTo(229.57,2));
  it('prevents duplicate active bank loans',()=>{const offer={name:'Micro',principal:1000,apr:8,term:12,minScore:400};expect(()=>takeLoan(takeLoan(createGame('A','B'),offer),offer)).toThrow()});
});
describe('family',()=>{
  it('initializes mother, father, brother, grandmother and grandfather',()=>{const g=createGame('A','B');expect(g.relationships.map(x=>x.relationType)).toEqual(['MOTHER','FATHER','BROTHER','GRANDMOTHER','GRANDFATHER']);expect(g.familyEvents).toEqual([])});
  it('charges interaction time and cash',()=>{const g=transact(createGame('A','B'),'JOB_INCOME',100,'Seed');const visited=performInteraction(g,'mother','VISIT');expect(visited.cash).toBe(90);expect(visited.hour).toBe(11);expect(visited.relationships[0].interactionHistory[0].timeHours).toBe(3)});
  it('records memories and relationship changes',()=>{const g=performInteraction(createGame('A','B'),'father','CALL');const father=g.relationships.find(x=>x.id==='father')!;expect(father.relationshipScore).toBeGreaterThan(68);expect(father.memories[0].type).toBe('CALLED')});
  it('enforces interaction cooldowns',()=>{const once=performInteraction(createGame('A','B'),'mother','CALL');expect(()=>performInteraction(once,'mother','CALL')).toThrow('cooldown')});
  it('purchases gifts with diminishing repeat impact',()=>{let g=transact(createGame('A','B'),'JOB_INCOME',1000,'Seed');g=purchaseGift(g,'mother','SMALL');const first=g.relationships[0].giftHistory[0].relationshipEffect;g=purchaseGift(g,'mother','SMALL');expect(g.cash).toBe(930);expect(g.relationships[0].giftHistory[0].relationshipEffect).toBeLessThanOrEqual(first)});
  it('rejects gifts when funds are insufficient',()=>expect(()=>purchaseGift(createGame('A','B'),'mother','LUXURY')).toThrow('Insufficient'));
  it('decays relationships gently after long inactivity',()=>{const g=advanceGameTime(createGame('A','B'),75*24);expect(g.relationships[0].relationshipScore).toBeLessThan(74);expect(g.relationships[0].memories.some(x=>x.type==='INACTIVE')).toBe(true)});
  it('records personal financial help and loans',()=>{const funded=transact(createGame('A','B'),'JOB_INCOME',3000,'Seed');const helped=giveFinancialHelp(funded,'grandmother',500,'LOAN');const record=helped.relationships.find(x=>x.id==='grandmother')!.financialHistory[0];expect(helped.cash).toBe(2500);expect(record.kind).toBe('LOAN');expect(record.status).toBe('ACTIVE')});
  it('generates a birthday once',()=>{let g={...createGame('A','B'),date:{year:2026,month:5,day:13},hour:23};g=advanceGameTime(g,1);expect(g.familyEvents.filter(x=>x.id==='birthday-mother-2026')).toHaveLength(1);g=advanceGameTime(g,24);expect(g.familyEvents.filter(x=>x.id==='birthday-mother-2026')).toHaveLength(1)});
  it('creates personal debt when approved',()=>{const r=askBrother(createGame('A','B'),500,0);expect(r.approved).toBe(true);expect(r.state.personalDebts[0].amount).toBe(500);expect(netWorth(r.state)).toBe(0)});
  it('preserves brother loan and repayment flow',()=>{const borrowed=askBrother(createGame('A','B'),500,0).state;const paid=repayBrother(borrowed,borrowed.personalDebts[0].id,100);expect(paid.personalDebts[0].repaidAmount).toBe(100);expect(paid.cash).toBe(400);expect(paid.relationships.find(x=>x.relationType==='BROTHER')!.memories[0].type).toBe('DEBT_REPAID')});
  it('limits requests to once per month',()=>{const first=askBrother(createGame('A','B'),500,1).state;expect(askBrother(first,500,0).approved).toBe(false)});
});
describe('reselling',()=>{
  const funded=()=>transact(createGame('A','B'),'JOB_INCOME',500,'Work');
  it('purchases into inventory',()=>{const g=buyItem(funded(),MARKET_OFFERS[0]);expect(g.businesses[0].inventory).toHaveLength(1);expect(g.cash).toBe(380)});
  it('sells a listed item and records profit',()=>{let g=buyItem(funded(),MARKET_OFFERS[0]);g=listItem(g,g.businesses[0].inventory[0].id,169);g=resolveSales(g,0);expect(g.businesses[0].sales[0].profit).toBe(49);expect(g.cash).toBe(549)});
  it('rejects invalid list prices',()=>{const g=buyItem(funded(),MARKET_OFFERS[0]);expect(()=>listItem(g,g.businesses[0].inventory[0].id,-1)).toThrow()});
});
describe('time and save shape',()=>{
  it('progresses across month boundary',()=>expect(addDays({year:2026,month:1,day:31},1)).toEqual({year:2026,month:2,day:1}));
  it('serializes and restores the full state',()=>{const g=createGame('Ada','Lovelace');const restored=JSON.parse(JSON.stringify(g));expect(restored).toEqual(g);expect(restored.schemaVersion).toBe(4)});
  it('migrates prompt 01 saves without losing the brother trust',()=>{const current=createGame('Ada','Lovelace');const legacy:any={...current,schemaVersion:1,relationships:[{id:'marco',name:'Marco',type:'BROTHER',trust:61}]};delete legacy.hour;delete legacy.familyEvents;delete legacy.staff;const migrated=migrateGameState(legacy);expect(migrated.schemaVersion).toBe(4);expect(migrated.relationships).toHaveLength(5);expect(migrated.relationships.find(x=>x.relationType==='BROTHER')!.trust).toBe(61);expect(migrated.staff.candidates.length).toBeGreaterThan(0)});
});
