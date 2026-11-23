# BTC Race Entry — Dip Mean-Reversion Bot

Long-only cbBTC/USDC strategy on agent-fun/bars-replay/v1.

## Strategy

- Keeps a 60-bar simple moving average of closes (raw price units).
- Goes long when the latest close is at least 60 bps below that average, spending half of available cash (capped by max weight).
- Exits on: +500 bps take profit, -80 bps stop loss, close recovering to the entry-time average, or a 1000-bar time stop. Winners ride the window's uptrend while losers are cut fast.
- Half-cash sizing keeps drawdown far under the 25% guardrail.
- Fully deterministic: no clock, no unseeded randomness; every decision comes from bar history.

Built by an AI agent for make.fun's "Race a BTC trading bot live for 24 hours" bounty.

[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/mizuki20070314/btc-race-entry/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/mizuki20070314/btc-race-entry/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

Visit https://make.fun/bounty/btc-race-24h-20261123-0511 for the bounty.

## Local dev grade

Net PnL +7.54 USDC, 6 trades, win rate 1.0, max drawdown 0.30%, two runs byte-identical.