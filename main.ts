// Dip mean-reversion bot for cbBTC/USDC 1m bars, long only.
import { BPS, runBars, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const MA_BARS = 60;
const ENTRY_DIP_BPS = 60;
const TAKE_PROFIT_BPS = 500;
const STOP_LOSS_BPS = 80;
const MAX_HOLD_BARS = 1000;
const COOLDOWN_BARS = 0;
const SIZE_FRACTION = 50;    // percent of cash to spend per entry
const MAX_SLIPPAGE_BPS = 250;

// close history (raw price ints at price_scale)
const closes: number[] = [];
let entrySeq: number | null = null;
let entryMa: number | null = null;
let lastExitSeq: number | null = null;

function ma(): number | null {
  if (closes.length < MA_BARS) return null;
  let s = 0;
  for (let i = closes.length - MA_BARS; i < closes.length; i++) s += closes[i];
  return s / MA_BARS;
}

function pctBps(a: bigint, b: bigint): number {
  // (a-b)/b in bps as number, b>0
  return Number((a - b) * 10000n / b);
}

await runBars({
  onBatch(state, batch) {
    for (const bar of batch.bars) {
      if (bar.symbol === SYMBOL) closes.push(Number(bar.c));
    }
    const orders: (BuyInput | SellInput)[] = [];
    const held = state.positions.get(SYMBOL);
    const m = ma();
    const lastClose = state.close(SYMBOL);
    if (lastClose === null || m === null) return orders;

    // Exit logic
    if (held) {
      const value = state.value(SYMBOL, held.qty);
      const gainBps = pctBps(value, held.cost);
      const heldTooLong = entrySeq !== null && (state.seq - entrySeq) >= MAX_HOLD_BARS;
      const takeProfit = gainBps >= TAKE_PROFIT_BPS;
      const stopLoss = gainBps <= -STOP_LOSS_BPS;
      const meanReverted = entryMa !== null && lastClose >= entryMa; // close back to entry-time MA
      if (takeProfit || stopLoss || meanReverted || heldTooLong) {
        orders.push({ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
        entrySeq = null;
        entryMa = null;
        lastExitSeq = state.seq;
      }
      return orders;
    }

    // Entry logic: dip below MA
    const dipBps = -pctBps(lastClose, BigInt(Math.round(m))); // positive when below
    const cooldownOk = lastExitSeq === null || (state.seq - lastExitSeq) >= COOLDOWN_BARS;
    if (cooldownOk && dipBps >= ENTRY_DIP_BPS) {

      const slice = (state.cash * BigInt(SIZE_FRACTION)) / 100n;
      const byWeight = (BigInt(state.hello.caps.max_weight_bps) * state.equity) / BPS;
      let spend = slice < byWeight ? slice : byWeight;
      if (spend < BigInt(state.hello.fees.min_notional_quote_units)) spend = 0n;
      if (spend > 0n) {
        orders.push({ side: 'buy', symbol: SYMBOL, notional_quote_units: spend, max_slippage_bps: MAX_SLIPPAGE_BPS });
        entrySeq = state.seq;
        entryMa = m;
      }
    }
    return orders;
  },
});