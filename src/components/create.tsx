"use client";
import Link from "next/link";
import { useWalletAccess } from "./wallet-access";
import { accountHref } from "@/client/account-flow";
import { useAccount } from "./account-provider";
import { useEffect, useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { useRouter } from "next/navigation";
import {
  draftSchema,
  type Draft,
  type Bounty,
  parseSOL,
  formatSOL,
} from "@/domain/bounty";
import { api } from "./header";
import { DraftAssistant } from "./assistance";
import { Banner, Button, Enter, Icon } from "./ui";
const empty: Draft = {
  title: "",
  description: "",
  category: "Translation",
  requirements: [""],
  reward: "",
};
const example: Draft = {
  title: "Translate our community announcement into Spanish",
  description:
    "Welcome to the Bountini community! Join our kickoff on Friday at 18:00 UTC. Bring one idea for a small quest. Read more at https://bountini.us.",
  category: "Translation",
  requirements: [
    "Translate into natural, neutral Spanish.",
    "Preserve the date, time and URL exactly.",
    "Keep the welcoming tone.",
    "Submit the complete translation as text.",
  ],
  reward: "0.1",
};
export function Create() {
  const { me, loading } = useAccount();
  if (loading)
    return (
      <div className="page" role="status">
        Loading your account…
      </div>
    );
  if (!me)
    return (
      <div className="page account-page">
        <h1>Sign in to post a quest.</h1>
        <p>
          Create and verify your account before preparing your private brief.
        </p>
        <Link
          className="button primary"
          href={accountHref("/create", "requester")}
        >
          Sign in or create an account
        </Link>
      </div>
    );
  return <CreateForm key={me.user.id} />;
}
function CreateForm() {
  const router = useRouter();
  const { me } = useAccount();
  const { wallet } = useWalletConnection();
  const walletReady = useWalletAccess();
  const [draft, setDraft] = useState<Draft>(empty);
  const [loaded, setLoaded] = useState(false);
  const draftKey = `bountini.draft.v2:${me?.user.id || "guest"}`;
  const [review, setReview] = useState(false);
  const [agree, setAgree] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setLoaded(false);
    setDraft(empty);
    setReview(false);
    setAgree(false);
    try {
      const stored = localStorage.getItem(draftKey);
      if (stored) {
        const p = JSON.parse(stored);
        if (
          p &&
          typeof p.title === "string" &&
          typeof p.description === "string" &&
          Array.isArray(p.requirements) &&
          p.requirements.every((r: unknown) => typeof r === "string") &&
          typeof p.reward === "string" &&
          ["Translation", "Writing", "Community", "Development"].includes(
            p.category,
          )
        )
          setDraft(p);
      }
    } catch {}
    setLoaded(true);
  }, [draftKey]);
  useEffect(() => {
    if (loaded) localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [draft, loaded, draftKey]);
  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setError("");
  }
  function validate() {
    const parsed = draftSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      const field = parsed.error.issues[0].path[0];
      document
        .getElementById(
          field === "requirements" ? "requirement-0" : String(field),
        )
        ?.focus();
      return;
    }
    setDraft(parsed.data);
    setReview(true);
    setError("");
  }
  async function save() {
    setPending(true);
    setError("");
    try {
      const session = await api<{ wallet: string }>("/api/auth/session");
      if (session.wallet !== wallet?.account.address)
        throw new Error(
          "Sign in with your email, then link your connected wallet in the header before saving.",
        );
      const { bounty } = await api<{ bounty: Bounty }>("/api/bounties", {
        method: "POST",
        body: JSON.stringify(draft),
      });
      localStorage.removeItem(draftKey);
      router.push(`/bounties/${bounty.id}`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to save. Your draft is preserved.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Enter>
      <div className="page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              {review ? "Make it clear before you commit" : "One useful thing"}
            </p>
            <h1>{review ? "Review your quest." : "Create with Bountini."}</h1>
            <p className="muted">
              {review
                ? "These requirements become fixed when you fund escrow."
                : "Tell us what needs doing. Keep the brief small and specific."}
            </p>
          </div>
        </div>
        <div className="split">
          <div className="form">
            {!me && (
              <Banner>
                <Link href="/account">Sign in or create your account</Link>{" "}
                before saving a quest. You can prepare your draft here.
              </Banner>
            )}
            {me && !walletReady && (
              <Banner>
                Use “Connect wallet” in the header, then sign the ownership
                message before saving your quest. No SOL is charged for linking.
              </Banner>
            )}
            {error && <Banner error>{error}</Banner>}
            {review ? (
              <>
                <h2>{draft.title}</h2>
                <p className="submission-text">{draft.description}</p>
                <h3>Requirements</h3>
                <ul className="checklist">
                  {draft.requirements.map((r, i) => (
                    <li key={i}>
                      <Icon name="check" />
                      {r}
                    </li>
                  ))}
                </ul>
                <div className="panel">
                  <span className="eyebrow">Reward · Solana Devnet</span>
                  <p className="detail-reward">
                    {formatSOL(parseSOL(draft.reward))} SOL
                  </p>
                  <p className="helper">
                    Network fees and account rent are separate from the reward.
                    Your wallet will display the transaction before you sign.
                  </p>
                </div>
                <label className="terms">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                  />
                  <span>
                    I understand the fixed requirements and timing rules. Work
                    may remain unpaid if I reject it or the review expires.
                  </span>
                </label>
                <div className="actions">
                  <Button
                    pending={pending}
                    disabled={!agree || !walletReady}
                    onClick={save}
                  >
                    {pending ? "Saving quest…" : "Save & continue to funding"}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={pending}
                    onClick={() => setReview(false)}
                  >
                    Edit requirements
                  </Button>
                </div>
                <p className="helper" style={{ marginTop: 16 }}>
                  Saving creates a private draft. Funding always requires a
                  separate wallet transaction.
                </p>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  validate();
                }}
              >
                <Banner>
                  Your draft is saved on this device as you type. Review each
                  requirement before funding.
                </Banner>
                <div
                  className="actions"
                  style={{ marginTop: 0, marginBottom: 24 }}
                >
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setDraft(example)}
                  >
                    Use translation example
                  </Button>
                </div>
                <DraftAssistant
                  onApply={(proposal) => {
                    setDraft((d) => ({ ...d, ...proposal }));
                    setAgree(false);
                  }}
                />
                <div className="field">
                  <label htmlFor="title">Quest title</label>
                  <input
                    id="title"
                    value={draft.title}
                    onChange={(e) => update("title", e.target.value)}
                    maxLength={120}
                    required
                    placeholder="Translate a community announcement"
                  />
                </div>
                <div className="field">
                  <label htmlFor="description">Describe the task</label>
                  <textarea
                    id="description"
                    value={draft.description}
                    onChange={(e) => update("description", e.target.value)}
                    maxLength={10000}
                    required
                    aria-describedby="description-help"
                  />
                  <span id="description-help" className="helper">
                    Include source text and the context your contributor needs.
                  </span>
                </div>
                <div className="field">
                  <label htmlFor="task-category">Category</label>
                  <select
                    id="task-category"
                    value={draft.category}
                    onChange={(e) =>
                      update("category", e.target.value as Draft["category"])
                    }
                  >
                    {["Translation", "Writing", "Community", "Development"].map(
                      (c) => (
                        <option key={c}>{c}</option>
                      ),
                    )}
                  </select>
                </div>
                <fieldset className="field">
                  <legend>Requirements checklist</legend>
                  {draft.requirements.map((r, i) => (
                    <div className="amount" key={i}>
                      <input
                        id={`requirement-${i}`}
                        aria-label={`Requirement ${i + 1}`}
                        value={r}
                        onChange={(e) =>
                          update(
                            "requirements",
                            draft.requirements.map((v, j) =>
                              i === j ? e.target.value : v,
                            ),
                          )
                        }
                        required
                        maxLength={1000}
                      />
                      {draft.requirements.length > 1 && (
                        <Button
                          type="button"
                          variant="quiet"
                          aria-label={`Remove requirement ${i + 1}`}
                          onClick={() =>
                            update(
                              "requirements",
                              draft.requirements.filter((_, j) => j !== i),
                            )
                          }
                        >
                          <Icon name="close" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="quiet"
                    type="button"
                    disabled={draft.requirements.length >= 12}
                    onClick={() =>
                      update("requirements", [...draft.requirements, ""])
                    }
                  >
                    + Add requirement
                  </Button>
                </fieldset>
                <div className="field">
                  <label htmlFor="reward">Reward</label>
                  <div className="amount">
                    <input
                      id="reward"
                      inputMode="decimal"
                      value={draft.reward}
                      onChange={(e) => update("reward", e.target.value)}
                      required
                      aria-describedby="reward-help"
                    />
                    <span>SOL</span>
                  </div>
                  <span id="reward-help" className="helper">
                    Solana Devnet · Test SOL only · Up to 9 decimal places.
                  </span>
                </div>
                <Button type="submit">
                  Review requirements <Icon name="arrow" />
                </Button>
              </form>
            )}
          </div>
          <aside className="panel" style={{ alignSelf: "start" }}>
            <p className="eyebrow">The agreement</p>
            <h3>A clear finish line.</h3>
            <ul className="checklist">
              <li>
                <Icon name="user" />
                One contributor per quest.
              </li>
              <li>
                <Icon name="clock" />
                30 minutes to deliver.
              </li>
              <li>
                <Icon name="clock" />
                10 minutes to review.
              </li>
              <li>
                <Icon name="refresh" />
                One 10-minute revision, then a fresh 10-minute review.
              </li>
            </ul>
            <p className="helper">
              Only you approve payment. A refund needs a confirmed transaction;
              an elapsed timer does not move funds.
            </p>
          </aside>
        </div>
      </div>
    </Enter>
  );
}
