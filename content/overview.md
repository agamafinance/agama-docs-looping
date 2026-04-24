# Overview

Agama is a decentralized lending and borrowing protocol for Brazilian Real World Assets (RWA) on Rayls. It lets holders of tokenized private credit (AmFi senior tranche, Nimofast receivables) leverage their positions, while giving retail crypto users access to RWA-backed yield.

## The gap

Brazilian private credit is a $200B+ market almost entirely off-chain. A handful of issuers (AmFi, Nimofast, Provi, Santander) have tokenized slices of it on Ethereum or Rayls, but the tokens sit in institutional wallets with no leverage, no composable yield, no secondary utility.

At the same time, retail crypto users cannot reach these products directly.

Agama closes both gaps:

- **Unlocks leverage** for existing holders (loop their yield-bearing positions).
- **Exposes RWA yield** to retail via `agTOKEN`.
- **Creates a stability backstop** where deposits earn supply yield *and* liquidation gains.

In theory, this transforms a `x%` real-world yield into a `x + (z−1)·(x−y)%` leveraged yield strategy.
