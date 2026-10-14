/** Explanatory context only. Account and wallet controllers remain authoritative. */
export function AccountContext({ profile = false }: { profile?: boolean }) {
  return (
    <aside
      className="account-context"
      aria-label={profile ? "Profile guidance" : "Getting started"}
    >
      <img
        src="/brand/logos/bountini-symbol-cobalt.svg"
        width="48"
        height="48"
        alt=""
      />
      <h2>
        {profile
          ? "A little context goes a long way."
          : "A common place to make progress."}
      </h2>
      <p>
        {profile
          ? "Share the skills and experience that help others understand your contribution."
          : "Bring one clearly scoped task, or find one you can help with. Your account keeps the work together."}
      </p>
      <img
        className="account-context-art"
        src="/brand/illustrations/agreement.webp"
        width="180"
        height="180"
        alt=""
      />
      <dl>
        <div>
          <dt>{profile ? "Public" : "Start with your account"}</dt>
          <dd>
            {profile
              ? "Your name, bio, skills and portfolio."
              : "Email first. Choose your workspace when you’re ready."}
          </dd>
        </div>
        <div>
          <dt>{profile ? "Private" : "Connect by choice"}</dt>
          <dd>
            {profile
              ? "Your email remains private."
              : "Wallet connection and signing always require your explicit action."}
          </dd>
        </div>
      </dl>
      <p className="helper">Solana Devnet beta · Test SOL has no cash value.</p>
    </aside>
  );
}
