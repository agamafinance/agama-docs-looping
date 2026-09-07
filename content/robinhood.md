# Robinhood Chain

Agama brings private credit yield to Robinhood tokenized stocks. A holder of a Robinhood Stock Token (e.g. TSLA) deposits it as collateral in an isolated Morpho Blue market on Robinhood Chain, borrows stablecoin against it, and deploys that stablecoin into Agama's private credit pools, earning a real-world yield spread while keeping full upside on the stock.

## The flow

1. **Deposit.** A Robinhood Stock Token (TSLA) goes into an isolated Morpho Blue market as collateral.
2. **Borrow.** Stablecoin is drawn against it, up to the market's 85% LLTV.
3. **Deploy.** The borrowed stablecoin enters Agama's private credit pools ([Lending Pools](/lending-pools/overview)).
4. **Earn the spread.** Private credit yield minus borrow rate, while the stock position stays intact.

Each market is isolated: a problem in one collateral market never touches another. This is the same isolation model the rest of the protocol uses, see [Risks](/risks).

## Why a custom oracle

Robinhood Stock Tokens implement [ERC-8056](https://eips.ethereum.org/EIPS/eip-8056) (Scaled UI Amount extension): the token exposes a `uiMultiplier()` that folds in corporate actions such as splits and NAV erosion.

The subtlety: Robinhood's own Chainlink feeds price the **raw token directly**, with corporate actions already applied by the price reporter, confirmed against Robinhood's reference implementation and the live mainnet TSLA feed. A Morpho oracle adapter must therefore read the feed as-is and must **not** re-apply `uiMultiplier()`. An adapter that applies it anyway double-counts the adjustment and overvalues collateral by exactly the multiplier factor after a split, an instant bad-debt vector.

`RobinhoodStockOracle` is that adapter, kept deliberately small:

- Implements Morpho Blue's `IOracle` convention: `price()` returns the collateral price scaled by `10^(36 + loanDecimals − collateralDecimals)`.
- Reads `latestRoundData()` from the Chainlink feed, rejects non-positive answers.
- Staleness guard tuned for equities: stock feeds update 24/5, so the max price age allows a long weekend before reverting with `StalePrice`.

## Deployed contracts

Robinhood Chain testnet, chain id `46630`:

| Contract | Address |
|---|---|
| `RobinhoodStockOracle` | [`0x77D28482ace00b7760766a7699e6DcdDeAeed82E`](https://explorer.testnet.chain.robinhood.com/address/0x77d28482ace00b7760766a7699e6dcddeaeed82e) |
| `MockChainlinkAggregator` (standin feed) | [`0xBb4c3A08E108465b305205D92C089cd1a63976b6`](https://explorer.testnet.chain.robinhood.com/address/0xbb4c3a08e108465b305205d92c089cd1a63976b6) |
| `MockUSDC` (loan asset) | [`0xC0E346206B5d6446f69522D29A88BC45B2B5c719`](https://explorer.testnet.chain.robinhood.com/address/0xc0e346206b5d6446f69522d29a88bc45b2b5c719) |
| Morpho Blue core (pre-existing on testnet) | `0x9A88db5f32c7227e5C7FFabe2188Af2E4d5B91c4` |

The live market: collateral = real testnet TSLA, loan = MockUSDC, LLTV = 85%, market id `0x0804d86012423b37100eb8cbd56029f54992cfcfce809f457f6f707a05d55bfb`.

## Proven on-chain, not just in tests

Everything below ran as real broadcast transactions on Robinhood Chain testnet, each step confirmed independently on-chain after broadcast (via `idToMarketParams`, `position`, `market` reads, not just script logs):

- **Full lifecycle.** Create market → supply 10,000 mUSDC liquidity → deposit 2 TSLA → borrow 300 mUSDC → repay 150 → withdraw 0.5 TSLA, against the real Morpho Blue core contract already live on testnet.
- **Real market data.** Chainlink has no feeds on this testnet, so a relay script reads the live mainnet TSLA Chainlink price and pushes it onto the testnet feed. The testnet market prices against real market data ($404.28 at last relay), not an arbitrary number.
- **Liquidation stress test.** A fresh borrow priced at the live relayed price, then the feed deliberately crashed to $50 to force the position underwater, then a real `liquidate()` call on the real Morpho contract seizing 0.5 TSLA. The full oracle → health check → liquidation pipeline works, not just the happy path.
- **Mainnet fork e2e.** The same flow forked against the real mainnet Morpho core and the real live Chainlink TSLA feed together, closing the one gap testnet couldn't cover.

Plus unit tests against mocks and fork tests against the real testnet TSLA token and the real mainnet feed: `forge test -vv`, 9 tests.
