# FAQ

**What is Agama?**
A protocol that turns USDC into a yield-bearing position in real-world private credit and bonds. You deposit USDC into the Vault and receive agUSD, you stake agUSD for sagUSD, and a Curator deploys the capital into vetted credit vaults under limits the contracts enforce on every allocation.

**What is agUSD?**
A synthetic dollar. The Vault mints it 1:1 against USDC and is the only address allowed to mint or burn it. It is a plain SEP-41 token with no transfer restriction on holders, so other Soroban protocols can accept it. See [agUSD](/agusd/overview).

**Does agUSD earn yield?**
No. A withdrawal returns one USDC per agUSD burned, and the redemption rate does not move with the portfolio. Yield reaches holders through sagUSD, whose exchange rate rises as the book earns. See [sagUSD](/sagusd/overview).

**What is sagUSD?**
Staked agUSD, and the position that earns. You receive shares at the current exchange rate, and yield arrives by raising that rate rather than by changing balances. No claim step, no rebase, no manual compounding.

**Can I deposit straight into one credit vault?**
No. There is one entry point, USDC into the Vault. Capital reaches the credit vaults only through the Allocation Engine, which is admin-directed in V1 and constraint-enforcing on every call. See [Credit Vaults](/credit-vaults/overview).

**Who decides where the capital goes?**
A Curator, which in V1 is the admin multi-sig. The Engine does not choose, it refuses: every `allocate()` call is checked against a cap per pool, a cap per originator, a cap per jurisdiction and a minimum idle USDC reserve floor, and any one of them failing reverts the whole call. In V2 an off-chain optimizer proposes allocations through the same admin-gated functions, with the same enforcement.

**Is agUSD redeemable for USDC?**
Yes, through a two-step queue. Requesting a withdrawal burns the agUSD and gives you a numbered claim; claiming pays USDC once that claim is at the front of the queue and the Vault holds the cash. The queue is strictly first in, first out, with no priority path for anyone including the admin. Waits run from around five minutes when the Vault has idle reserves to days or weeks when everything is deployed into private credit. See [Risks](/risks).

**Is there a way out without queueing?**
Yes. agUSD trades against USDC on Soroswap, so you can swap in a single transaction and take the market price instead of waiting for settlement.

**What backs the yield?**
Real-world borrowers: private credit obligors and government bond issuers. Repayments come back to the Vault and are distributed by raising the sagUSD exchange rate. There is no protocol emission subsidizing the return.

**What is live today?**
agUSD, sagUSD and the six credit vaults are deployed on Stellar Testnet and verifiable on Stellar Expert. The Vault, the Allocation Engine and the Oracle Adapter are written and tested, with testnet deployment scheduled. See [Deployments](/stellar/deployments) for addresses and [End-to-End Flow](/stellar/flow) for the status of each step.

**Have the contracts been audited?**
Not yet. An external review by OtterSec is scheduled after the testnet code freeze and before mainnet contracts hold user funds. The contracts are public under Apache-2.0 in the meantime. See [Audit Status](/security/audit).
