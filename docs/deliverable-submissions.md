# Private deliverable submissions

Workers may combine a written response (20,000 characters), up to eight labeled HTTPS links, and up to six attachments. At least 10 characters of written work, a link, or a nonempty validated attachment is required. Preparation creates a frozen snapshot; workers review its summary before explicitly signing on Solana Devnet. Preparation never funds escrow or approves payment.

## Storage and limits

Private **Vercel Blob**, store `bountini-deliverables` (`store_ojuCqkZ8rbDoBDbD`, iad1), is connected for Production and Development. The team is on Hobby: published allowances include 1 GB storage/month, 10,000 simple operations, 2,000 advanced operations and 10 GB transfer. Hobby has no overage charges; exceeding the allowance pauses Blob access. No paid plan was provisioned. Before a paid upgrade, review storage, operations and function delivery/transfer usage and obtain approval. [Pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing).

The server uses `BLOB_READ_WRITE_TOKEN` or linked `BLOB_STORE_ID` + rotating `VERCEL_OIDC_TOKEN`. None are public environment variables. Neon stores metadata and manifests, never attachment contents. `CRON_SECRET` is configured privately in local and production environments. No further configuration is required for this release. A separate Preview environment would need its own private storage connection and cleanup secret if enabled.

Each file is limited to **2 MiB**. Upload requests go through an authenticated server route, below Vercel's function body limit. Limits also include 12 upload requests per worker/minute and 40 live upload reservations per quest.

Allowlist:

- PNG, JPEG/JPG and WebP: decoded with sharp, at most 16 million pixels, one frame.
- PDF: parsed, unencrypted, 1–20 pages.
- UTF-8 text/code: `.txt .md .csv .json .js .jsx .ts .tsx .py .rs .go .java .c .cpp .h .css .html .xml .yaml .yml .sql .sh`. Empty, binary and invalid UTF-8 content is rejected. Browser MIME hints are ignored.

Images preview privately. Text/code previews use escaped React text, capped at 20,000 characters; full files remain downloadable. Code/HTML is never executed or rendered as HTML. PDFs and downloads use attachment disposition and `application/octet-stream`; PDFs are not embedded into a document viewer. Responses use `nosniff`, a sandbox CSP and private/no-store caching. Files are not malware-scanned; use appropriate local viewers for downloaded files.

Uploads require a verified linked wallet belonging to the assigned worker, valid quest state and an unexpired deadline. Downloads require an authenticated participant account. The requester can access files only after their manifest confirms; the worker can preview their own uploads beforehand. Five-minute HMAC access URLs bind account, file and preview/download mode. Authorization repeats on every read, so sharing a URL grants no access to another account. Blob credentials and object paths are never returned to clients.

## Immutable receipts and recovery

`bountini-deliverables-v1` includes quest ID, submission version (0 original / 1 revision), written response, labeled URLs and attachment IDs, names, byte sizes, derived MIME types and SHA-256 byte hashes. Serialization uses fixed field order, NFC/LF strings, UTF-8 JSON and lexically sorted attachment IDs. Link order remains as reviewed. No operation IDs, timestamps, storage paths or expiring access URLs enter the hash.

The server hashes and freezes the snapshot **before signing**. The existing Anchor `submit([u8;32])` instruction commits that hash. No program deployment or escrow policy change is needed. Migration 008 adds immutable snapshots and attachment bindings. Database triggers project the exact frozen snapshot only after the existing reconciler verifies the finalized transaction. Confirmed legacy text and manifest submissions cannot be edited or deleted; revision creates a new version.

An upload's UUID survives retries. An existing object is accepted only if its bytes hash matches. Completed references and links persist under an account-scoped local draft key; interrupted files can be retried while the page remains open. After reload, an unfinished file must be selected again. Rejected signing preserves files and snapshots; uncertain broadcasts retain the existing signature/operation recovery flow. Account/wallet changes invalidate pending UI results and prevent stale signing/broadcast continuation.

Daily cleanup at 07:00 UTC removes only unbound uploads older than 24 hours. A deleting tombstone blocks new bindings; row locks serialize cleanup with snapshot preparation. Storage failures leave tombstones for retry. **All frozen attempts are retained**, even rejected/expired attempts, to preserve recovery; this can consume storage over time. Confirmed files are never selected for cleanup.

Legacy text-only API submissions retain their original NFC/LF text hash and receipt. A URL receipt proves the exact URL submitted, not its destination's contents now or in the future. Prefer commit-specific repository links and uploaded snapshots. No external URL is fetched by the application or advisory reviewer.

## Advisory review

Gemini **3.6 Flash** supports text, images and PDFs, checked against its [model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash). This release supplies verified text/code (20,000 characters/file, 60,000 total), PNG/JPEG/WebP and PDF contents within a 6 MiB total binary budget. Media is skipped if an unverified model is configured. Missing, unsupported, truncated and unavailable materials are explicitly identified. The inventory records what was supplied, not a guarantee of perfect model comprehension. Responses cite filenames where possible and identify URLs as uninspected. All content is untrusted data. AI cannot sign, approve, pay or change deadlines.

## Validation

**142 regression tests**, TypeScript and production build passed. Coverage includes authorization, malformed/oversized files, byte validation, interrupted multipart/object uploads, duplicate retries, deterministic hashing, private ticket binding/expiry, preparation failures, account/wallet changes, rejected signatures, escaped previews, bounded AI extraction and URL non-fetching.

The local two-account **real Devnet** walkthrough completed original/revised submissions with a link and text/image/PDF attachments, exact stored/on-chain hash comparison, participant access, copied/anonymous URL denial, duplicate preparation, lost-response recovery, signature rejection/retry, database immutability checks, live Gemini review, payout/refund and legacy text-only submission. Cleanup was exercised against real private objects and retained confirmed bytes. Evidence: `output/deliverables-devnet-demo.json`, `output/deliverables-ai-review.json`, `output/deliverable-cleanup-verification.json`.

Hosted verification after the single finished Git commit/push:

```sh
DEMO_REVISION=true DEMO_ASSISTANCE=true DEMO_ORIGIN=https://bountini.us DEMO_WORKER_ONLY=true node --env-file=.env.local --import tsx scripts/verify-deliverables-devnet.ts
```

This creates controlled test accounts/Devnet quests and requires the existing ignored deployment payer keypair. Git deployment and hosted results are recorded separately after verification. No mainnet transactions are used.
