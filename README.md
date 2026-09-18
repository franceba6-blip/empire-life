# Empire Life v0.0.1

Mobile-first business and life tycoon built with Expo, React Native, and TypeScript.

## Run

```bash
npm install
npm test
npm run typecheck
npx expo start --tunnel
```

Scan the QR code with Expo Go on iPhone. The game works locally and persists saves with AsyncStorage.

## Prompt 03 — Real estate and testing

Open **Assets** for the market and **My Properties** for portfolio management.
Thirteen property types and five fictional regions are configured in
`src/game/realEstate/config.ts`. No paid assets or live property data are used.

- Cash purchase or mortgage with 20–99% down payment, 10/15/25/30-year terms.
  Credit score and existing debt influence eligibility and APR.
- One primary residential home; vacant buildings can find tenants. Ending a
  lease takes 30 game days. Land cannot be let as a building or occupied.
- Each property bills every 30 game days after purchase. First rental income
  is prorated from lease start. Running costs apply even while vacant.
  Unpaid costs and mortgage interest remain liabilities; no negative cash or
  silently discarded bills. Delinquent mortgages can take longer to repay.
- Renovations cost money upfront and complete after 7/25/60/120 game days.
  Gains diminish near perfect condition; luxury upgrades need not be profitable.
- Sales use market, location-influenced value and condition, charge 3% fees,
  settle debt and preserve capital profit/loss history.
- Manager fees are 12% of collected rent. Both management modes collect rent
  automatically in this version; staff tasks and tenant incidents come later.
- Market offerings refresh monthly; a simple deterministic market cycle affects
  values, new-lease rent and tenant-search duration. Existing leases keep their rent.

**Developer / Test Mode:** open the button in Assets. Enter the separate test
save, then choose **Set Cash to €1,000,000,000**. It initially copies the normal
save and subsequently resumes its own progress. A persistent DEBUG banner shows
when the test save is active. Money adjustments are `DEBUG_TRANSACTION` ledger
entries and do not count as earned income. Day, 30-day and 365-day controls use
the same central clock as ordinary gameplay. Restarting the app opens normal
progress. Test resets/new games stay in the test slot. This debug panel is
explicitly labelled and intentionally available in this testing release.

Save schema 5 migrates Prompt 01–04 saves under the original normal-save key;
the test slot uses a different key. Writes are serialized to prevent stale writes.

## Prompt 04–05 — Staff and car dealership

Open **Business → Staff / Management** to hire, develop, promote and delegate
work to employees. Salaries, morale, workload, training and automation advance
through the central game clock. Employee expenses reduce real business profit.

Open **Business → Car Dealership** to start a small, medium or premium fictional
dealership. The module includes a seven-day wholesale market, deterministic
vehicle valuation, inspections, negotiation, workshop repairs, cosmetic
preparation, showroom capacity, price strategies, customer matching, sales,
reputation, holding costs, expansions and multiple-location data. Vehicle
Buyer, Salesperson, Mechanic, Detailer and Dealership Manager roles affect real
outcomes. Full management can source, process, list and sell stock dynamically.
All brands are fictional and no vehicle logos or paid assets are used.

The isolated test save additionally provides vehicle scenarios, elite staff,
instant work completion, reputation/capacity controls and forced sales.

Validation: `npm test`, `npm run typecheck`, `npx expo-doctor`,
`npx expo export --platform ios`. Expo generates route types when starting the
project; after adding routes, run `npx expo start` once before typechecking a
workspace with stale `.expo/types` output.

For iPhone: `npx expo start --tunnel --clear`, scan the new QR using the iPhone
Camera and select **Open in Expo Go**. Keep the Codespace and terminal running.
