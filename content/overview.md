# Overview

Agama is a decentralized lending and borrowing protocol for Brazilian Real World Assets (RWA) on Rayls. It enables qualified investors holding tokenized private credit (AmFi senior tranche, Nimofast receivables) to leverage their positions, while giving retail crypto users access to RWA-backed yield with light-touch KYC.

## The gap

Brazilian private credit is a $200B+ market almost entirely off-chain. A handful of issuers (AmFi, Nimofast, Provi, Santander) have tokenized slices of it on Ethereum or Rayls, but the tokens sit in QI wallets with no leverage, no composable yield, no secondary utility.

At the same time, retail crypto users cannot reach these products directly — qualified investor gating blocks them.

Agama closes both gaps:

- **Unlocks leverage** for existing QI holders (loop their yield-bearing positions).
- **Exposes RWA yield** to retail via `agTOKEN` (no QI gate, KYC Light only).
- **Creates a stability backstop** where deposits earn supply yield *and* liquidation gains.

In theory, this transforms a `x%` real-world yield into a `x + (z−1)·(x−y)%` leveraged yield strategy.
