import Link from "next/link";
export default function Home() {
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">A little work goes a long way</p>
          <h1>
            Small quests.
            <br />
            <em>Real rewards.</em>
          </h1>
          <p className="lead">
            Turn “someone should do this” into a clear task. Find your
            contributor. Reward work you approve.
          </p>
          <div className="actions">
            <Link className="button primary large" href="/create">
              Create a quest <span aria-hidden="true">↗</span>
            </Link>
            <Link className="button secondary large" href="/discover">
              Find your next quest
            </Link>
          </div>
          <p className="helper" style={{ marginTop: 24 }}>
            Built on Solana Devnet. Rewards are test SOL, with no cash value.
          </p>
        </div>
        <div className="hero-art">
          <img
            src="/brand/logos/bountini-symbol-white.svg"
            alt="Bountini stepped mark"
          />
          <span>One clear next step.</span>
        </div>
      </section>
      <section className="process">
        <div className="process-inner">
          <p className="eyebrow">From good intention to done</p>
          <h2>Make contribution simple.</h2>
          <div className="steps">
            {[
              [
                "01",
                "Describe the work",
                "Set a clear brief, a checklist and a reward. Review everything before funding.",
              ],
              [
                "02",
                "Give it a home",
                "Escrow holds the reward. One contributor claims the quest and has 30 minutes to deliver.",
              ],
              [
                "03",
                "Review. Then reward.",
                "Check the submission yourself. Approve to pay, or request one revision. Review expiry makes a refund available.",
              ],
            ].map(([n, title, body]) => (
              <div key={n}>
                <span className="number">{n} /</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
