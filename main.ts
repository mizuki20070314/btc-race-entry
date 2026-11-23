// cbBTC/USDC dip mean-reversion bot, long only, bars-replay/v1.
import { runBars, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const MA_LEN = 60;
const ENTRY_DIP_BPS = 60;
const TAKE_PROFIT_BPS = 500;
const STOP_LOSS_BPS = 80;
const TIME_STOP_BARS = 1000;
const SIZE_PCT = 50;
const SLIPPAGE_CAP_BPS = 250;

const closes: number[] = [];
let entrySeq: number | null = null;
let entryMa: number | null = null;
let lastExitSeq: number | null = null;

function movingAverage(): number | null {
  if (closes.length < MA_LEN) return null;
  let sum = 0;
  for (let i = closes.length - MA_LEN; i < closes.length; i++) sum += closes[i];
  return sum / MA_LEN;
}

function bpsDiff(a: bigint, b: bigint): number {
  return Number((a - b) * 10000n / b);
}

await runBars({
  onBatch(state, batch) {
    for (const bar of batch.bars) {
      if (bar.symbol === SYMBOL) closes.push(Number(bar.c));
    }

    const orders: (BuyInput | SellInput)[] = [];
    const held = state.positions.get(SYMBOL);
    const ma = movingAverage();
    const last = state.close(SYMBOL);
    if (last === null || ma === null) return orders;

    // exit checks
    if (held) {
      const mark = state.value(SYMBOL, held.qty);
      const gainBps = bpsDiff(mark, held.cost);
      const tooLong = entrySeq !== null && (state.seq - entrySeq) >= TIME_STOP_BARS;
      const tp = gainBps >= TAKE_PROFIT_BPS;
      const sl = gainBps <= -STOP_LOSS_BPS;
      const reverted = entryMa !== null && last >= entryMa;
      if (tp || sl || reverted || tooLong) {
        orders.push({ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: SLIPPAGE_CAP_BPS });
        entrySeq = null;
        entryMa = null;
        lastExitSeq = state.seq;
      }
      return orders;
    }

    // entry: dip below MA
    const dipBps = -bpsDiff(last, BigInt(Math.round(ma)));
    // cooldown is intentionally 0 bars: re-enter on the next qualifying dip
    const coolOk = lastExitSeq === null || (state.seq - lastExitSeq) >= 0;
    if (coolOk && dipBps >= ENTRY_DIP_BPS) {
      const slice = (state.cash * BigInt(SIZE_PCT)) / 100n;
      const weightCap = (BigInt(state.hello.caps.max_weight_bps) * state.equity) / 10000n;
      let spend = slice < weightCap ? slice : weightCap;
      if (spend < BigInt(state.hello.fees.min_notional_quote_units)) spend = 0n;
      if (spend > 0n) {
        orders.push({ side: 'buy', symbol: SYMBOL, notional_quote_units: spend, max_slippage_bps: SLIPPAGE_CAP_BPS });
        entrySeq = state.seq;
        entryMa = ma;
      }
    }
    return orders;
  },
});