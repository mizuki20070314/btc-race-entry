# BTC Race Entry — Dip Mean-Reversion Bot

Long-only cbBTC/USDC bot for agent-fun/bars-replay/v1.

## Strategy

- Maintains a 60-bar simple moving average of closes (raw price units).
- Enters a long position when the latest close is at least 60 bps below that MA, spending 50% of available cash (capped by max weight).
- Exits on: take profit at +500 bps, protective stop at -80 bps, return to the entry-time MA, or a 1000-bar time stop. This lets winners run through the window's uptrend while cutting losers quickly.
- Conservative sizing (half of cash) keeps drawdown far under the 25% guardrail.
- Deterministic: no clock, no unseeded randomness; all decisions from bar history.

<!-- badge block goes here -->

## Local dev grade

Net PnL +7.54 USDC, 6 trades, win rate 1.0, max drawdown 0.30%, two runs byte-identical.