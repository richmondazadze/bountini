import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page account-page access-state">
      <img
        src="/brand/logos/bountini-symbol-cobalt.svg"
        width="48"
        height="48"
        alt=""
      />
      <p className="eyebrow">Page not found</p>
      <h1>Let’s find your next step.</h1>
      <p>
        This page is unavailable or its address has changed. You can browse open
        quests or return to your workspace.
      </p>
      <div className="actions">
        <Link className="button primary" href="/discover">
          Find a quest
        </Link>
        <Link className="button secondary" href="/my">
          Your workspace
        </Link>
      </div>
    </div>
  );
}
