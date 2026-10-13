"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function ProductFooter() {
  const home = usePathname() === "/";
  if (!home)
    return (
      <footer>
        <img
          src="/brand/logos/bountini-symbol-ink.svg"
          alt=""
          width="24"
          height="24"
        />
        <span>Small quests. Real rewards.</span>
        <span>Solana Devnet · Test SOL only</span>
      </footer>
    );
  return (
    <footer className="pp-footer">
      <div className="pp-container pp-footer-grid">
        <div>
          <Link href="/" aria-label="Bountini home">
            <img
              src="/brand/logos/bountini-horizontal-ink.svg"
              alt="Bountini"
              width={148}
              height={34}
            />
          </Link>
          <p>Small quests. Real rewards.</p>
          <p className="helper">Devnet beta · Test SOL has no cash value.</p>
        </div>
        <nav aria-label="Explore Bountini">
          <h3>Explore</h3>
          <Link href="/discover">Find a quest</Link>
          <Link href="/create">Post a quest</Link>
          <a href="/#how-it-works">How it works</a>
        </nav>
        <nav aria-label="About Bountini">
          <h3>Company</h3>
          <a href="/#about">About Bountini</a>
          <a href="/#communities">Community use cases</a>
          <a
            href="https://github.com/richmondazadze/bountini"
            target="_blank"
            rel="noreferrer"
          >
            Project source ↗
          </a>
        </nav>
        <nav aria-label="Bountini help">
          <h3>Getting started</h3>
          <a href="/#faq">FAQ & Devnet rules</a>
          <a href="/#voice">Voice-to-brief</a>
          <a href="/#evidence">Inspectable evidence</a>
        </nav>
      </div>
    </footer>
  );
}
