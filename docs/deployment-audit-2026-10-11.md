# GitHub and Vercel deployment audit

The repository was private and is now public at https://github.com/richmondazadze/bountini. A credential-pattern scan of Git history found no matching credentials; local secrets and temporary keypairs are ignored. This scan is not a guarantee against every form of sensitive content.

The existing Vercel project prj_mXlF2lKN9zyL2jFtLomYygUYPHNh had no Git repository link. Its recent deployment list showed source=cli throughout. Multiple CLI snapshots could carry the same commit SHA while containing different uncommitted files. These were repeat manual releases and retries, not parallel GitHub/CLI builds.

The latest failed deployment dpl_DRr8RaozT6Sfoz5cxuXqV7QzCTKV failed because the separate motion/video source was included in web TypeScript checking without its Remotion dependencies. The motion directory is now excluded in tsconfig.json and .vercelignore; the next release dpl_38tK93wjP87JU9HZe393gjYx5FKW passed. An earlier failure dpl_6b9U612NuobxZc7GnzuTon3Ra35k was a TypeScript error in the funding button guard; it was corrected before the next successful release.

Connected richmondazadze/bountini to the existing Vercel project using Vercel's authenticated Git-connect CLI. The release policy is now commit/push main once and verify that Git deployment; no accompanying manual production deployment. GitHub Actions contains validation only, not a second Vercel deploy workflow. Production variables and bountini.us remain on the existing project.
