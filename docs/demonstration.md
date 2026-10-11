# Repeatable Devnet demonstration

Open https://bountini.us in two browser profiles with independently funded Devnet wallets. Never import the deployment key into the application.

1. Connect the requester wallet and sign the authentication message.
2. Create a Translation quest: translate “The community meeting starts at 10 AM on Saturday” into neutral Spanish. Require preservation of Saturday and 10 AM. Set reward to 0.001 test SOL. Text creation works without providers; optional voice capture and Gemini suggestions remain editable.
3. Review the requirements acknowledgement, save the private draft, then fund. Wait for verified confirmation before sharing its Details URL.
4. In the worker profile, connect and sign in. Open the URL and claim. Submit “La reunión de la comunidad comienza a las 10:00 a. m. el sábado.”
5. The requester opens Submit & Review. Optional Gemini review is advisory. Approve and wait for the verified Paid state. Check the activity receipt in Solana Explorer with Devnet selected.
6. Create/fund another quest and cancel it before any claim. Wait for Refunded and inspect the refund receipt. Withdrawal requires the assigned worker signature; expired deadlines expose requester refund actions and do not execute a transaction automatically.

To rehearse the same API and actual-chain paths using two ephemeral independent signers, place a funded Devnet test payer in ignored tmp/devnet-payer.keypair.json and run:

```sh
DEMO_ORIGIN=https://bountini.us DEMO_ASSISTANCE=true node --env-file=.env.local --import tsx scripts/devnet-demo.ts
```

The rehearsal spends test SOL only, asserts exact payout/refund balance deltas, and writes output/devnet-demo.json. It creates public demonstration quests. Do not use a mainnet payer. Authentication/privacy smoke checks use scripts/check-api.ts with the same DEMO_ORIGIN.

A browser microphone walkthrough remains necessary: provider WebSocket audio and text response were tested, but physical microphone speech and ASR were not automated.
