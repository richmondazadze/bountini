"use client";
import Link from "next/link";
import { useState, type ReactNode, type Ref } from "react";
import { Button, Dialog } from "@/components/ui";
import "./experience.css";
export type WorkspaceMode = "requester" | "worker";
export type WorkspaceLink = { href: string; label: string; active?: boolean };
/** Controlled shell: parent owns account role persistence and permission checks. */
export function WorkspaceHeader({
  mode,
  links,
  onModeChange,
  homeHref = "/",
  accountContent,
  pending = false,
  publicAccountContent,
  menuButtonRef,
}: {
  mode?: WorkspaceMode;
  links: WorkspaceLink[];
  onModeChange?: (mode: WorkspaceMode) => void;
  homeHref?: string;
  accountContent?: ReactNode | ((closeMenu: () => void) => ReactNode);
  publicAccountContent?: ReactNode;
  menuButtonRef?: Ref<HTMLButtonElement>;
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header
        className={`experience-header${mode ? "" : " experience-public-header"}`}
      >
        <Link
          className="experience-home"
          href={homeHref}
          aria-label="Bountini home"
        >
          <img
            src="/brand/logos/bountini-horizontal-ink.svg"
            width="148"
            height="40"
            alt="Bountini"
          />
        </Link>
        <nav
          className="experience-desktop-nav"
          aria-label={mode ? `${mode} navigation` : "Main navigation"}
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.active ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        {mode && (
          <label className="experience-mode">
            <span className="experience-sr-only">Workspace mode</span>
            <select
              value={mode}
              disabled={pending}
              aria-busy={pending || undefined}
              onChange={(e) => onModeChange?.(e.target.value as WorkspaceMode)}
            >
              <option value="requester">Requester</option>
              <option value="worker">Worker</option>
            </select>
          </label>
        )}
        {publicAccountContent && (
          <div className="experience-public-account">
            {publicAccountContent}
          </div>
        )}
        <span className="experience-network">Devnet · Test SOL</span>
        <Button
          ref={menuButtonRef}
          className="experience-menu-button"
          aria-haspopup="dialog"
          variant="quiet"
          aria-label={mode ? "Open workspace menu" : "Open public menu"}
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <img src="/brand/icons/menu.svg" width="20" height="20" alt="" />
        </Button>
      </header>
      <Dialog
        containFocus
        open={open}
        onClose={() => setOpen(false)}
        title={
          mode
            ? `${mode === "requester" ? "Requester" : "Worker"} workspace`
            : "Bountini menu"
        }
      >
        <nav className="experience-menu-nav" aria-label="Workspace menu">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.active ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        {typeof accountContent === "function"
          ? accountContent(() => setOpen(false))
          : accountContent}
        <p className="experience-menu-network">
          Solana Devnet · Test SOL has no cash value.
        </p>
      </Dialog>
    </>
  );
}
