# Stage 5 human-browser rehearsal

This checklist is **not yet completed**. Automated API tests and scripted Devnet wallets do not verify microphone permission, real speech recognition or a human wallet-extension confirmation. Those steps must be performed by the user; they do not block independent backend/UI implementation.

Use separate browser profiles for requester and worker, and accounts whose credentials you already know. The existing `request@bountini.us` and `worker@bountini.us` accounts may be used if available. Do not reset them or remove prior user records. Backend service tests reuse isolated generated Stage 4 accounts; their credentials/keypairs remain only in ignored private files and must not be pasted into chat. Use **Solana Devnet test SOL only**, confirm the active wallet is the linked participant wallet, and stop if a wallet prompt says Mainnet.

## Requester

1. Open the public homepage signed out. Follow Post a quest / Start with voice. Confirm account-first continuation preserves `/create` and requester intent; no wallet popup or microphone request opens merely from loading the public page.
2. Sign in or create an account. Confirm Requester mode is restored. Switch mode once and confirm it changes navigation, never access to another participant's private workroom.
3. Connect your intended wallet explicitly; sign the ownership-proof message yourself. Check its exact account/address and Devnet network. A connected wallet alone must not count as an email login or proof.
4. Start voice and handle the browser's microphone permission yourself. Describe the task, deliverable, criteria and a decimal test-SOL reward. Verify focused clarification, a spoken summary, the additions question, and the wait for your answer. Add a final criterion, then explicitly confirm completion.
5. Confirm voice ends and an **unsaved editable** Gemini proposal appears automatically with the final criterion. Confirm it is a crafted brief without raw transcript/speaker labels. Existing rewards must remain; a confirmed spoken reward should fill a blank field only. Make an edit during generation and confirm the proposal is offered for review rather than silently overwriting it.
6. In a separate unsaved session, use Stop voice. Confirm stopping/disconnection alone does not generate. Edit the preserved transcript and use Suggest requirements, or continue typing. Deny microphone permission once if comfortable; verify the typed fallback. Never claim those cases passed unless actually observed.
7. Review agreement/criteria/reward, save the draft and explicitly confirm funding in your wallet. Verify unknown/pending state is not reported as success; use Check confirmation before retrying. Record only a finalized Devnet receipt as funded.

## Worker and requester review

8. In the worker profile, sign in with Worker intent, explicitly connect/prove the worker's own wallet, inspect funded terms and confirm the claim yourself. Check that a different linked wallet/account cannot act as the assigned worker.
9. Exchange workroom messages. Retry a failed send without creating a duplicate; load older messages, read them during polling, and confirm the reader position remains stable.
10. Prepare written work plus a labeled HTTPS commit link and a small image/text/PDF attachment. Observe actual transfer/validation states, retry an interrupted upload, and verify supported previews/downloads. Review the frozen summary before signing; decline once and confirm the draft/files survive. Then explicitly sign submission.
11. Requester must see only confirmed original work and private files. Anonymous/unrelated accounts must not access messages, feedback or attachments, even with a copied access URL.
12. Opt into Gemini review. Check model/hash/material provenance, supported assessed contents and explicitly unassessed external URL destinations. AI remains advisory; failures must leave human review usable and must not extend deadlines.
13. Request one revision with specific feedback; worker retrieves it and resubmits. Confirm original/revised versions remain distinguishable and immutable. Record rejection once: reward stays locked, the current review deadline does not reset, and approval remains available before expiry.
14. Requester explicitly confirms Approve & pay. Verify finalized paid state, receipt and test-SOL payout, not just a countdown or AI suggestion. On a separate controlled quest, test the authorized cancellation/expiry refund flow; never refund someone else's record or assume expiry itself signs a transaction.

Record browser/wallet versions, account roles, quest IDs, public Devnet signatures, observations and failures. Keep passwords, session cookies, provider keys and private keys out of the report. Monitor the existing in-app Report an issue workflow separately: it stores a report, but no response-time or monitored-support guarantee has been established. Generic contact destination and approved legal content remain owner-supplied dependencies.
