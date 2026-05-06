# Testnet Mode (Demo)

V1 ships with a **testnet-only demo mode** that exposes a small set of governance-gated "cheats" so integrators, auditors, and demo recordings can step through liquidation and settlement flows without waiting hours or days for state to evolve naturally. None of these functions are reachable on mainnet.

!!! danger

    **Mainnet safety.** Demo-mode entrypoints are guarded by a hardcoded `isDemoMode` flag on each contract that ships them. The flag is set at deployment and cannot be flipped post-deployment. Mainnet deployments set `isDemoMode = false`; calls to any cheat revert with `DemoModeDisabled()`.

## The `isDemoMode` flag

```solidity
bool public immutable isDemoMode;

modifier onlyDemoMode() {
    if (!isDemoMode) revert DemoModeDisabled();
    _;
}
```

`immutable` means the flag is baked into the bytecode at construction. There is no setter, no upgrade path, no admin override. A mainnet deployment is irrevocably non-demo.

Front-ends should read `isDemoMode` from each contract on load and gate the demo-cheats UI accordingly. Any contract whose `isDemoMode == true` should be considered a testnet artifact and never used to custody real user funds.

## The four cheats

Each cheat is `onlyDemoMode` *and* `onlyManager` (or stricter). They exist solely to compress the wall-clock duration of a demo session.

### 1. Time travel

Advances per-position timers (Stability Pool unstake cooldown, settlement-vault `staleBatchPeriod`, oracle staleness window, etc.) without waiting for `block.timestamp` to actually progress.

> **Implementation note.** Exact function signature and the set of timers it advances are pinned to the testnet contract version. Confirm with the deployment manifest before scripting against it.

### 2. Mint test tokens

Mints test USDr and test RWA collateral directly to a target address. Used to seed demo accounts (Alice, Bob) without running an off-chain faucet.

> **Implementation note.** Test-only token contracts expose this; the production USDr / AmFi senior tranche tokens do not. Confirm the token addresses on each testnet deployment.

### 3. Force liquidation

Marks a borrower's health factor below `1` regardless of oracle state, then runs the standard `liquidateBorrower` flow. Useful for demonstrating the Stability Pool absorption path on demand.

> **Implementation note.** V1 liquidations are single-step and atomic — there is no on-chain grace period to bypass. The cheat is purely about pinning the HF; the seizure itself runs the same code path as production.

### 4. Oracle override

Sets a synthetic price on the asset adapter's price feed for a chosen RWA token. Used to demonstrate price-driven liquidation and shortfall scenarios.

> **Implementation note.** The override is per-adapter and persists until the next override or until natural oracle staleness restores the live feed.

## Operational guidance

- **Auditors / integrators.** Demo mode lets you run the full Phase 1 → Phase 3 liquidation flow in minutes. We recommend pairing cheat #4 (oracle override) with cheat #3 (force liquidation) and cheat #1 (time travel) to exercise the settlement path end-to-end.
- **Front-ends.** Surface a clear "TESTNET" banner whenever any connected contract has `isDemoMode == true`. Treat demo-mode token balances as non-fungible with mainnet positions.
- **Deployment.** Demo-mode entrypoints are stripped from mainnet bytecode at compile time via a build flag, so even if a future bug allowed flipping `isDemoMode`, the cheat function bodies would be empty. This is belt-and-braces; the immutable flag is the primary guardrail.

> **Status.** This page documents the V1 testnet contract surface. Specific function signatures and access patterns are pinned to the testnet release manifest — confirm against the deployment artifact before scripting integrations.
