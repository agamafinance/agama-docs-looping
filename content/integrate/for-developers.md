# For Developers

## Contract interfaces

Once mainnet ships, TypeScript types will be published as `@agamafi/contracts-sdk`. Preview:

```typescript
const pool = AgamaLendingPool__factory.connect(POOL_ADDRESS, signer);
const hf = await pool.calculateHealthFactor(adapter, user, data);
```

## Subgraph

Agama publishes a subgraph on The Graph (or Rayls-native indexer) covering:

- Every deposit / withdraw / borrow / repay event.
- Position state per user per adapter.
- Liquidation lifecycle events.
- Settlement batches.
- Interest rate history.

Schema TBD at launch. Preview query:

```graphql
query UserPositions($user: Bytes!) {
  user(id: $user) {
    agTokenBalance
    positions {
      adapter
      positionKey
      rawDebt
      scaledDebt
      collateralValue
      healthFactor
      isUnderLiquidation
    }
    spDeposits {
      agaSPBalance
      pendingWithdraw {
        amount
        readyAt
      }
    }
  }
}
```

## Read example: get user health factor

```typescript
async function getUserHealth(pool: AgamaLendingPool, user: string, adapter: string) {
  const positionKey = await adapter.getPositionKey(data);
  const hf = await pool.calculateHealthFactor(adapter, user, data);
  const hfNormalized = hf / BigInt(1e27);
  return { hf, hfNormalized: Number(hfNormalized) / 1e18 };
}
```

## Write example: deposit + borrow

```typescript
async function depositAndBorrow(
  pool: AgamaLendingPool,
  adapter: AmFiAdapter,
  usdxp: IERC20,
  amfiToken: IERC20,
  collateralAmount: bigint,
  borrowAmount: bigint
) {
  await amfiToken.approve(adapter.address, collateralAmount);

  const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [collateralAmount]);

  await (await pool.openVaultPosition()).wait();       // one-time
  await (await pool.depositAsset(adapter.address, data)).wait();
  await (await pool.borrow(adapter.address, data, borrowAmount)).wait();
}
```

## Listening for liquidation events

```typescript
pool.on('LiquidationInitiated', (sender, user, adapter, data) => {
  console.log(`Liquidation started for ${user} on adapter ${adapter}`);
});

pool.on('LiquidationFinalized', (sp, user, adapter, data, debt, collateralValue) => {
  console.log(`${user} liquidated: debt ${debt}, collateral ${collateralValue}`);
});
```

## Best practices

- Always call `reserve.updateState()` mentally before querying — view functions return current-block state but on-chain mutations happen between blocks.
- For production health monitoring, poll `getPositionView` for synthesized state (includes HF, flags, etc.) — one RPC call per position.
- Respect rate limits on the subgraph and Rayls RPC.
- Handle the `isUnderLiquidation` flag — UIs should disable borrow/deposit buttons when true.
