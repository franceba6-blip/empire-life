import { GameState, InventoryItem } from '@/models/game';
import { transact } from '@/game/economy/economy';
import { makeId } from '@/utils/id';

export function buyItem(state: GameState, offer: Omit<InventoryItem, 'id'> & { id: string }): GameState {
  const item = { ...offer, id: makeId('item') };
  let next = transact(state, 'BUSINESS_PURCHASE', offer.purchasePrice, `Purchased ${offer.name}`, item.id);
  next = { ...next, businesses: next.businesses.map(b => b.type === 'RESELLING' ? { ...b, inventory: [...b.inventory, item], cashInvested: b.cashInvested + offer.purchasePrice, expenses: b.expenses + offer.purchasePrice } : b) };
  return next;
}

export function listItem(state: GameState, itemId: string, price: number): GameState {
  if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid listing price');
  return { ...state, businesses: state.businesses.map(b => ({ ...b, inventory: b.inventory.map(i => i.id === itemId ? { ...i, listedPrice: price, listedAt: state.date } : i) })) };
}

export function resolveSales(state: GameState, roll = Math.random()): GameState {
  let next = state;
  const business = state.businesses.find(b => b.type === 'RESELLING')!;
  for (const item of business.inventory.filter(i => i.listedPrice)) {
    const demandBoost = item.demand === 'High' ? 0.18 : item.demand === 'Low' ? -0.12 : 0;
    const priceRatio = item.listedPrice! / item.marketValue;
    const chance = Math.max(0.05, Math.min(0.92, 1.15 - priceRatio * 0.65 + demandBoost));
    if (roll <= chance) {
      const saleId = makeId('sale');
      next = transact(next, 'BUSINESS_REVENUE', item.listedPrice!, `Sold ${item.name}`, saleId);
      next = { ...next, businesses: next.businesses.map(b => b.type === 'RESELLING' ? { ...b, inventory: b.inventory.filter(i => i.id !== item.id), revenue: b.revenue + item.listedPrice!, sales: [{ id: saleId, itemName: item.name, purchasePrice: item.purchasePrice, salePrice: item.listedPrice!, profit: item.listedPrice! - item.purchasePrice, soldAt: next.date }, ...b.sales] } : b), stats: { ...next.stats, itemsSold: next.stats.itemsSold + 1 } };
    }
  }
  return next;
}
