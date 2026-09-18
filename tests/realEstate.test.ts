import { describe, expect, it, vi } from "vitest";
vi.mock("@react-native-async-storage/async-storage", () => {
  const values = new Map<string, string>();
  return {
    default: {
      setItem: vi.fn(async (k: string, v: string) => {
        values.set(k, v);
      }),
      getItem: vi.fn(async (k: string) => values.get(k) ?? null),
      removeItem: vi.fn(async (k: string) => {
        values.delete(k);
      }),
    },
  };
});
import { createGame } from "../src/game/createGame";
import {
  debugCash,
  netWorth,
  monthlyIncome,
  transact,
} from "../src/game/economy/economy";
import { advanceGameTime, daysBetween } from "../src/game/time/time";
import {
  buyProperty,
  mortgagePayment,
  mortgageQuote,
  moveIn,
  portfolio,
  propertyCashflow,
  renovate,
  renovationQuote,
  rentOut,
  saleQuote,
  sellProperty,
  setManagement,
  vacate,
} from "../src/game/realEstate/realEstate";
import {
  loadGame,
  migrateGameState,
  saveGame,
  SAVE_KEY,
  TEST_SAVE_KEY,
} from "../src/persistence/save";
const funded = () =>
  debugCash({ ...createGame("Test", "Player"), mode: "TEST" }, 1e9, "SET");
const bought = (finance = false) => {
  const g = funded();
  return buyProperty(g, g.realEstate.listings[0].id, finance);
};
describe("property transactions", () => {
  it("generates all thirteen property types across locations", () => {
    const g = createGame("A", "B");
    expect(new Set(g.realEstate.listings.map((p) => p.propertyType)).size).toBe(
      13,
    );
    expect(new Set(g.realEstate.listings.map((p) => p.locationId)).size).toBe(
      5,
    );
  });
  it("buys cash through ledger without changing net worth or mutating input", () => {
    const g = funded(),
      p = g.realEstate.listings[0],
      n = buyProperty(g, p.id);
    expect(n.cash).toBe(g.cash - p.purchasePrice);
    expect(n.transactions[0].type).toBe("PROPERTY_PURCHASE");
    expect(n.realEstate.properties).toHaveLength(1);
    expect(g.realEstate.properties).toHaveLength(0);
    expect(n.hour - g.hour).toBe(2);
    expect(netWorth(n)).toBe(netWorth(g));
    expect(() => buyProperty(n, p.id)).toThrow();
  });
  it("rejects insufficient funds without creating ownership", () => {
    const g = createGame("A", "B");
    expect(() => buyProperty(g, g.realEstate.listings[0].id)).toThrow(
      "Insufficient",
    );
    expect(g.realEstate.properties).toHaveLength(0);
  });
  it("calculates an amortized and zero-interest mortgage", () => {
    expect(mortgagePayment(320000, 4.2, 300)).toBeCloseTo(1724.62, 2);
    expect(mortgagePayment(1200, 0, 12)).toBe(100);
    expect(() => mortgagePayment(1000, -1, 12)).toThrow();
  });
  it("charges only down payment and accounts for mortgage debt once", () => {
    const g = funded(),
      p = g.realEstate.listings[0],
      q = mortgageQuote(g, p),
      n = buyProperty(g, p.id, true);
    expect(n.cash).toBe(g.cash - q.downPayment);
    expect(n.realEstate.properties[0].mortgage?.remainingBalance).toBe(
      q.principal,
    );
    expect(netWorth(n)).toBe(netWorth(g));
    expect(portfolio(n).equity).toBe(q.downPayment);
  });
  it("rejects low down payment, bad credit and excessive debt", () => {
    const g = funded(),
      p = g.realEstate.listings[0];
    expect(() => mortgageQuote(g, p, 0)).toThrow();
    expect(() => mortgageQuote({ ...g, creditScore: 400 }, p)).toThrow();
    expect(() =>
      mortgageQuote(
        {
          ...g,
          cash: 0,
          personalDebts: [
            {
              id: "d",
              creditorId: "x",
              creditorName: "X",
              amount: 20000,
              repaidAmount: 0,
              createdAt: g.date,
              status: "ACTIVE",
            },
          ],
        },
        p,
      ),
    ).toThrow("debt");
  });
  it("keeps only one home and disallows commercial owner occupancy", () => {
    let g = bought();
    const a = g.realEstate.properties[0].id;
    g = moveIn(g, a);
    g = buyProperty(
      g,
      g.realEstate.listings.find((p) => p.propertyType === "HOUSE")!.id,
    );
    const b = g.realEstate.properties[1].id;
    g = moveIn(g, b);
    expect(g.player.homePropertyId).toBe(b);
    expect(
      g.realEstate.properties.filter(
        (p) => p.occupancyState === "OWNER_OCCUPIED",
      ),
    ).toHaveLength(1);
    expect(propertyCashflow(g.realEstate.properties[1]).gross).toBe(0);
    expect(() => rentOut(g, b)).toThrow();
    g = buyProperty(
      g,
      g.realEstate.listings.find((p) => p.propertyType === "OFFICE")!.id,
    );
    expect(() => moveIn(g, g.realEstate.properties[2].id)).toThrow();
  });
  it("creates tenant only after search time and prevents double letting", () => {
    const g = bought(),
      id = g.realEstate.properties[0].id,
      n = rentOut(g, id);
    expect(daysBetween(g.date, n.date)).toBeGreaterThanOrEqual(7);
    expect(n.realEstate.properties[0].tenant?.monthlyRent).toBeGreaterThan(0);
    expect(n.realEstate.properties[0].occupancyState).toBe("RENTED");
    expect(() => rentOut(n, id)).toThrow();
  });
  it("settles sale debt, records capital profit and clears the home", () => {
    let g = bought(true);
    g = moveIn(g, g.realEstate.properties[0].id);
    const p = g.realEstate.properties[0],
      q = saleQuote(g, p),
      n = sellProperty(g, p.id);
    expect(n.cash).toBeCloseTo(g.cash + q.proceeds, 2);
    expect(n.realEstate.properties).toHaveLength(0);
    expect(n.player.homePropertyId).toBeUndefined();
    expect(n.realEstate.sales[0].profit).toBe(
      q.price - q.fees - p.purchasePrice,
    );
    expect(n.transactions.some((t) => t.type === "PROPERTY_SALE")).toBe(true);
  });
});
describe("central property clock", () => {
  it("collects prorated rent and operating costs exactly once per billing period", () => {
    let g = bought();
    g = rentOut(g, g.realEstate.properties[0].id);
    const p = g.realEstate.properties[0];
    const elapsed = daysBetween(p.tenant!.leaseStart, p.nextBillingAt!);
    const n = advanceGameTime(g, daysBetween(g.date, p.nextBillingAt!) * 24);
    const rent = n.transactions.filter((t) => t.type === "PROPERTY_RENT");
    expect(rent).toHaveLength(1);
    expect(rent[0].amount).toBeCloseTo(
      (p.tenant!.monthlyRent * elapsed) / 30,
      2,
    );
    expect(
      n.transactions.filter((t) => t.type === "PROPERTY_EXPENSE"),
    ).toHaveLength(1);
    const reload = migrateGameState(JSON.parse(JSON.stringify(n)));
    expect(
      advanceGameTime(reload, 1).transactions.filter(
        (t) => t.type === "PROPERTY_RENT",
      ),
    ).toHaveLength(1);
  });
  it("pays mortgage interest and principal and preserves the input", () => {
    const g = bought(true),
      m = { ...g.realEstate.properties[0].mortgage! };
    const n = advanceGameTime(g, 30 * 24),
      after = n.realEstate.properties[0].mortgage!;
    expect(after.remainingBalance).toBeCloseTo(
      m.remainingBalance +
        Math.round(((m.remainingBalance * m.apr) / 1200) * 100) / 100 -
        m.monthlyPayment,
      2,
    );
    expect(after.paymentsMade).toBe(1);
    expect(g.realEstate.properties[0].mortgage).toEqual(m);
  });
  it("charges vacant homes and retains unpaid costs and interest as liabilities", () => {
    let g = bought(true);
    g = debugCash(g, 0, "SET");
    const n = advanceGameTime(g, 30 * 24),
      p = n.realEstate.properties[0];
    expect(n.cash).toBe(0);
    expect(p.arrears).toBeGreaterThan(0);
    expect(p.mortgage!.arrears).toBeGreaterThan(0);
    expect(portfolio(n).debt).toBeGreaterThan(p.mortgage!.remainingBalance);
  });
  it("cashflow includes maintenance and management fees", () => {
    let g = bought(true);
    g = rentOut(g, g.realEstate.properties[0].id);
    g = setManagement(g, g.realEstate.properties[0].id, "MANAGER");
    const f = propertyCashflow(g.realEstate.properties[0]);
    expect(f.management).toBeCloseTo(f.gross * 0.12, 2);
    expect(f.net).toBeCloseTo(
      f.gross - f.operating - f.maintenance - f.management - f.mortgage,
      2,
    );
  });
  it("completes renovations only after their ingame duration", () => {
    const g = bought(),
      p = g.realEstate.properties[0],
      q = renovationQuote(p, "SMALL"),
      n = renovate(g, p.id, "SMALL");
    expect(n.cash).toBe(g.cash - q.cost);
    expect(n.realEstate.properties[0].condition).toBe(p.condition);
    expect(() => sellProperty(n, p.id)).toThrow();
    const before = advanceGameTime(n, 6 * 24);
    expect(before.realEstate.properties[0].renovation).toBeDefined();
    const done = advanceGameTime(before, 24);
    expect(done.realEstate.properties[0].renovation).toBeUndefined();
    expect(done.realEstate.properties[0].condition).toBe(
      p.condition + q.improvement,
    );
    expect(done.realEstate.properties[0].monthlyRentPotential).toBe(
      p.monthlyRentPotential + q.rentGain,
    );
  });
  it("prevents renovation without funds and while occupied", () => {
    const g = bought(),
      id = g.realEstate.properties[0].id;
    expect(() => renovate(debugCash(g, 0, "SET"), id, "LUXURY")).toThrow(
      "Insufficient",
    );
    expect(() => renovate(moveIn(g, id), id, "SMALL")).toThrow("vacant");
  });
  it("processes a full year without skipping billing cycles", () => {
    const n = advanceGameTime(bought(), 365 * 24);
    expect(
      n.transactions.filter((t) => t.type === "PROPERTY_EXPENSE"),
    ).toHaveLength(12);
    expect(n.realEstate.lastMarketMonth).toBe("2027-01");
    expect(n.realEstate.properties[0].estimatedMarketValue).not.toBe(
      n.realEstate.properties[0].purchasePrice,
    );
  });
  it("terminates a lease after notice and then allows moving in", () => {
    let g = bought(),
      id = g.realEstate.properties[0].id;
    g = rentOut(g, id);
    const d = g.date;
    g = vacate(g, id);
    expect(daysBetween(d, g.date)).toBe(30);
    expect(g.realEstate.properties[0].tenant).toBeUndefined();
    expect(moveIn(g, id).player.homePropertyId).toBe(id);
  });
});
describe("migration and isolated test mode", () => {
  it("migrates a genuine v2 shape without changing existing systems", () => {
    const original = createGame("Ada", "B");
    const { realEstate, mode, ...old } = original;
    const n = migrateGameState({ ...old, schemaVersion: 2 });
    expect(n.realEstate.properties).toEqual([]);
    expect(n.schemaVersion).toBe(5);
    expect(n.relationships).toEqual(original.relationships);
    expect(n.businesses).toEqual(original.businesses);
    expect(n.mode).toBe("NORMAL");
  });
  it("roundtrips properties, mortgage, renovation and next billing marker", () => {
    let g = bought(true);
    g = renovate(g, g.realEstate.properties[0].id, "MAJOR");
    expect(migrateGameState(JSON.parse(JSON.stringify(g)))).toEqual(g);
  });
  it("injects and sets a billion using DEBUG_TRANSACTION only in test mode", () => {
    expect(() => debugCash(createGame("A", "B"), 1e9)).toThrow();
    let g = funded();
    expect(g.cash).toBe(1e9);
    expect(g.transactions[0].type).toBe("DEBUG_TRANSACTION");
    expect(g.stats.lifetimeIncome).toBe(0);
    expect(monthlyIncome(g)).toBe(0);
    g = debugCash(g, 10, "SET");
    expect(g.cash).toBe(10);
    expect(g.transactions[0].direction).toBe("DEBIT");
    expect(() => debugCash(g, NaN)).toThrow();
    expect(() => transact(g, "DEBUG_TRANSACTION", 10, "bad")).toThrow();
  });
  it("stores normal and test games in distinct slots", async () => {
    expect(SAVE_KEY).not.toBe(TEST_SAVE_KEY);
    const normal = createGame("Normal", "Player");
    await saveGame(normal);
    await saveGame(funded());
    expect(await loadGame()).toEqual(normal);
    expect((await loadGame("TEST"))!.cash).toBe(1e9);
  });
});

it('switches saves and keeps reset/new-game confined to test mode', async () => {
  const { useGameStore } = await import('../src/store/gameStore');
  useGameStore.setState({game:null,activeSlot:'NORMAL'});
  await useGameStore.getState().newGame('Normal','Owner');
  const normal = useGameStore.getState().game!;
  await useGameStore.getState().switchMode('TEST');
  useGameStore.getState().update(g => debugCash(g,1e9,'SET'));
  await useGameStore.getState().reset();
  await useGameStore.getState().newGame('Test','Reset');
  expect(useGameStore.getState().game!.mode).toBe('TEST');
  expect(await loadGame('NORMAL')).toEqual(normal);
  await useGameStore.getState().switchMode('NORMAL');
  expect(useGameStore.getState().game).toEqual(normal);
});
