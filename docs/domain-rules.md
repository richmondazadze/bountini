# Domain contract v1 — approved

Devnet only. Funding fixes requester, integer lamports, canonical agreement SHA-256 and the windows. No update instruction. One worker, no requester self-claim. Chain Clock is authoritative. Valid action: now < deadline. Expiry: now >= deadline. Transaction fees are paid by the signer; program rent stays in the terminal bounty account to preserve receipts. Reward excludes rent and fees.

| Instruction | Actor | Source | Destination | Time/funds |
|---|---|---|---|---|
| fund | requester | absent | open | exact reward escrowed |
| claim | independent worker | open | in-progress | 30-minute delivery starts |
| submit | assigned worker | in-progress / revision-requested | in-review | before deadline; submission hash; fresh 10-minute review starts |
| approve | requester | in-review | paid | before deadline; full reward to assigned worker once |
| cancel | requester | open | refunded | full reward to requester |
| expire | requester | in-progress / in-review / revision-requested | refunded | deadline reached; full reward to requester |
| revise | requester | in-review, unused revision | revision-requested | before deadline; 10-minute revision starts |
| reject | requester | in-review | in-review | before deadline; feedback recorded; funds and deadline unchanged; later approval allowed |
| withdraw | assigned worker | in-progress / in-review / revision-requested | refunded | worker signature; closes bounty and refunds requester atomically |

User approved all three previously unresolved policies in this chat. A timely revision starts a fresh review and prevents the missed-revision refund path. No elapsed browser timer performs an instruction. No database update or client success flag establishes settlement. Terminal accounts are never closed; unsolicited extra lamports remain in the account, and are never mistaken for reward.
