<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Production deployment

Vercel is connected to GitHub and deploys main automatically. Commit and push the finished change once, then verify the resulting Git deployment. Do not run `vercel --prod` in addition to a push. Use manual production deployment only for an explicitly requested recovery or when Git deployment is unavailable; explain that exception. Never deploy uncommitted source as a normal release.
