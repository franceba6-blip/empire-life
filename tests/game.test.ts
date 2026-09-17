import { describe, expect, it } from 'vitest';
import { createGame } from '../src/game/createGame';
import { transact, netWorth } from '../src/game/economy/economy';
import { monthlyPayment, takeLoan } from '../src/game/economy/loans';
import { askBrother, repayBrother } from '../src/game/relationships/family';
import { buyItem, listItem, resolveSales } from '../src/game/businesses/reselling';
import { addDays } from '../src/game/time/time';
import { MARKET_OFFERS } from '../src/config/balance';

describe('economy',()=>{
  it('records income centrally',()=>{const g=transact(createGame('A','B'),'JOB_INCOME',80,'Work');expect(g.cash).toBe(80);expect(g.transactions).toHaveLength(1)});
  it('rejects invalid money',()=>{expect(()=>transact(createGame('A','B'),'JOB_INCOME',Number.NaN,'Bad')).toThrow();expect(()=>transact(createGame('A','B'),'JOB_INCOME',Infinity,'Bad')).toThrow()});
  it('rejects insufficient funds',()=>expect(()=>transact(createGame('A','B'),'BUSINESS_PURCHASE',1,'Buy')).toThrow('Insufficient'));
  it('calculates net worth including debt',()=>{const g=takeLoan(createGame('A','B'),{name:'Micro',principal:1000,apr:8,term:12,minScore:400});expect(netWorth(g)).toBe(0)});
  it('calculates amortized loan payment',()=>expect(monthlyPayment(5000,9.5,24)).toBeCloseTo(229.57,2));
  it('prevents duplicate active bank loans',()=>{const offer={name:'Micro',principal:1000,apr:8,term:12,minScore:400};expect(()=>takeLoan(takeLoan(createGame('A','B'),offer),offer)).toThrow()});
});
describe('family',()=>{
  it('creates personal debt when approved',()=>{const r=askBrother(createGame('A','B'),500,0);expect(r.approved).toBe(true);expect(r.state.personalDebts[0].amount).toBe(500);expect(netWorth(r.state)).toBe(0)});
  it('repays personal debt',()=>{const borrowed=askBrother(createGame('A','B'),500,0).state;const paid=repayBrother(borrowed,borrowed.personalDebts[0].id,100);expect(paid.personalDebts[0].repaidAmount).toBe(100);expect(paid.cash).toBe(400)});
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
  it('serializes and restores the full state',()=>{const g=createGame('Ada','Lovelace');const restored=JSON.parse(JSON.stringify(g));expect(restored).toEqual(g);expect(restored.schemaVersion).toBe(1)});
});
