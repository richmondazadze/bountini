import { DiagonalArrow } from "@/components/diagonal-arrow";
import Image from "next/image";
import Link from "next/link";
import {
  discoveryCategories,
  discoveryCategoryHref,
} from "@/client/discovery-links";
import { RoleWorkflow } from "./workflow";
import "./public-product.css";
const receipt =
  "https://explorer.solana.com/tx/4GGJaqmEkzwYftFWZmJLuSLATk8aibYN2qPRoWfKFr8GDRvrLd9GnTE2DPd9QibqkcFeC8Hk62domFo8et4cKF5A?cluster=devnet";
const categories = [
  { icon: "link", body: "Reach more people." },
  { icon: "quest", body: "Make the message clear." },
  { icon: "user", body: "Move a shared project forward." },
  { icon: "check", body: "Make a useful improvement." },
];
const faq = [
  [
    "Is this real-money work?",
    "No. Bountini currently uses Solana Devnet. Test SOL has no cash value. Network fees and rent are separate from the reward.",
  ],
  [
    "Is payment guaranteed?",
    "No. The requester must approve the confirmed work. Rejected or expired work may remain unpaid. Gemini review is optional and advisory; it never authorizes payment.",
  ],
  [
    "How long are the windows?",
    "The contributor has 30 minutes to deliver after claim confirmation. Requester review is 10 minutes. One revision is supported: 10 minutes to deliver the revision, followed by a fresh 10-minute final review.",
  ],
  [
    "Does rejection refund the reward?",
    "No. Rejection records feedback without immediate settlement or a deadline reset. The requester may still approve before review expiry. Expiry needs a signed requester action; the countdown alone never pays or refunds.",
  ],
  [
    "Can a contributor withdraw?",
    "The assigned contributor can sign a withdrawal while the quest is active. Withdrawal closes the quest and returns its reward to the requester atomically; the contributor’s work may remain unpaid.",
  ],
  [
    "Do I need a wallet to browse?",
    "No. Browse available quests publicly. Sign in to an email account before posting, claiming or communicating. Wallet connection is explicit; verify ownership with a signed message before signing escrow actions.",
  ],
  [
    "What can I deliver?",
    "A written response, labeled HTTPS links and supported private attachments can be combined. You review the prepared submission before signing. Original and revised confirmed versions remain unchanged; a link’s future contents are not guaranteed by its receipt.",
  ],
  [
    "Can an organization use Bountini?",
    "People working on community or organization projects can use individual accounts today. Team workspaces, organization permissions, shared funding and organization billing are not available.",
  ],
  [
    "Does the voice example record me?",
    "No. The landing example is an illustration. Real voice assistance is available inside the existing quest editor after sign-in, with explicit microphone permission. You review the proposed brief before saving or funding, and can use the manual form instead.",
  ],
];
export function ProductLanding() {
  return (
    <div className="pp-page">
      <section
        className="pp-container pp-hero"
        aria-label="Bountini introduction"
      >
        <div>
          <p className="eyebrow">A clear brief. A useful contribution.</p>
          <h1>
            Small work.
            <br />
            <em>Shared momentum.</em>
          </h1>
          <p className="pp-lead">
            Turn one community need into a well-scoped quest. One contributor,
            fixed requirements and a reward held in Devnet escrow.
          </p>
          <div className="pp-actions">
            <Link className="button primary large" href="/create">
              Post a quest
              <DiagonalArrow />
            </Link>
            <Link className="button secondary large" href="/discover">
              Find a contribution
            </Link>
          </div>
          <p className="pp-disclosure">
            Solana Devnet beta · Test SOL, no cash value.
          </p>
        </div>
        <figure className="pp-hero-visual">
          <Image
            src="/brand/illustrations/work-scene.webp"
            width={1536}
            height={1024}
            alt="Illustrative scene of two imagined people reviewing an event flyer at a shared table."
            sizes="(max-width: 800px) calc(100vw - 40px), (max-width: 1360px) 46vw, 600px"
            loading="eager"
            fetchPriority="high"
          />
          <div className="pp-product-note">
            <span className="pp-step">01</span>
            <div>
              <p className="eyebrow">An illustration of useful work</p>
              <strong>A welcoming invitation, translated.</strong>
              <p>Clear source text → Editable Spanish copy</p>
            </div>
            <img src="/brand/icons/check.svg" width={24} height={24} alt="" />
          </div>
          <figcaption>
            Generated work scene · Imagined people, not customers.
          </figcaption>
        </figure>
      </section>
      <section className="pp-container pp-section" id="categories">
        <div className="pp-section-top">
          <div>
            <p className="eyebrow">Start with a specific need</p>
            <h2>What could use a hand?</h2>
          </div>
          <Link href="/discover">
            Browse open quests <DiagonalArrow />
          </Link>
        </div>
        <div className="pp-categories">
          {discoveryCategories.map((category, i) => (
            <Link key={category} href={discoveryCategoryHref(category)}>
              <img
                src={`/brand/icons/${categories[i].icon}.svg`}
                width={32}
                height={32}
                alt=""
              />
              <div>
                <h3>{category}</h3>
                <p>{categories[i].body}</p>
              </div>
              <DiagonalArrow />
            </Link>
          ))}
        </div>
      </section>
      <RoleWorkflow />
      <section className="pp-container pp-section pp-voice" id="voice">
        <div>
          <p className="eyebrow">From an idea to an agreement</p>
          <h2>
            Say it simply.
            <br />
            <em>Shape it carefully.</em>
          </h2>
          <p>
            Voice assistance can help draft the brief. You review every detail
            before saving or funding.
          </p>
          <Image
            src="/brand/illustrations/voice.webp"
            width={180}
            height={180}
            alt=""
          />
          <Link className="button secondary" href="/create">
            Open the quest editor <DiagonalArrow />
          </Link>
          <p className="helper">
            Sign in first. Recording and wallet connection are your choice; the
            manual form remains available.
          </p>
        </div>
        <div className="pp-voice-example">
          <p className="eyebrow">Illustrative example · No recording</p>
          <h3>One idea. A clearer brief.</h3>
          <details>
            <summary>Explore a voice-to-brief example</summary>
            <div>
              <h4>A possible request</h4>
              <p>
                “Help me translate our neighborhood workshop invitation. Keep
                the date and location, make the Spanish welcoming, and provide
                editable text.”
              </p>
              <h4>A possible brief</h4>
              <p>
                Translate the supplied invitation into welcoming, neutral
                Spanish.
              </p>
              <ul>
                <li>Preserve the date, location and links.</li>
                <li>Use natural, welcoming language.</li>
                <li>Deliver editable written copy.</li>
              </ul>
            </div>
          </details>
          <p className="helper">
            This illustration does not use your microphone, generate or save a
            quest, or make a payment.
          </p>
          <Link className="button primary" href="/create">
            Draft your own quest
          </Link>
          <p className="pp-disclosure">
            Devnet beta · Review the requirements and test SOL reward before
            funding.
          </p>
        </div>
      </section>
      <section className="pp-proof pp-section" id="evidence">
        <div className="pp-container pp-proof-grid">
          <div>
            <p className="eyebrow">Evidence you can inspect</p>
            <h2>
              Clear about what’s real.
              <br />
              <em>Clear about the limits.</em>
            </h2>
            <p>
              Bountini is a Devnet beta. Inspect the project source and a
              confirmed approval from a controlled test. These are project
              evidence, not customer endorsements.
            </p>
          </div>
          <div className="pp-proof-links">
            <a
              href="https://github.com/richmondazadze/bountini"
              target="_blank"
              rel="noreferrer"
            >
              <strong>
                Read the project source <DiagonalArrow />
              </strong>
              <span>Public repository</span>
            </a>
            <a href={receipt} target="_blank" rel="noreferrer">
              <strong>
                Inspect a Devnet approval <DiagonalArrow />
              </strong>
              <span>Controlled test record · Test tokens only</span>
            </a>
            <a href="#faq">
              <strong>Understand the escrow rules</strong>
              <span>Approval, revision and expiry limits</span>
            </a>
          </div>
        </div>
      </section>
      <section className="pp-container pp-section" id="communities">
        <div className="pp-section-top">
          <div>
            <p className="eyebrow">For people building together</p>
            <h2>Useful work for shared projects.</h2>
            <p className="pp-copy">
              Communities and organizations can use individual accounts today.
              Scope one useful task, identify its owner and keep the outcome
              clear.
            </p>
          </div>
        </div>
        <div className="pp-usecases">
          <article>
            <p className="eyebrow">Community communication</p>
            <h3>Make the invitation easier to understand.</h3>
            <p>
              Translate an announcement, improve a welcome message or clarify
              event details.
            </p>
            <Link href={discoveryCategoryHref("Translation")}>
              Explore translation <DiagonalArrow />
            </Link>
          </article>
          <article>
            <p className="eyebrow">Project maintenance</p>
            <h3>Make the next contribution easier.</h3>
            <p>
              Check a guide, explain an unclear step or suggest a specific
              documentation improvement.
            </p>
            <Link href={discoveryCategoryHref("Development")}>
              Explore development <DiagonalArrow />
            </Link>
          </article>
        </div>
        <p className="helper">
          Team workspaces, shared funding and organization billing are not
          available.
        </p>
      </section>
      <section className="pp-container pp-section pp-about" id="about">
        <p className="eyebrow">About Bountini</p>
        <h2>A small, clear place to contribute.</h2>
        <p>
          Bountini connects individually owned quests with one contributor and
          requester-controlled review. Email accounts, explicit wallet
          ownership, private deliverables and inspectable Devnet transactions
          keep each next step clear.
        </p>
        <Link href="/discover">
          Explore the product <DiagonalArrow />
        </Link>
      </section>
      <section className="pp-container pp-section pp-faq" id="faq">
        <div>
          <p className="eyebrow">Before you begin</p>
          <h2>A few honest answers.</h2>
        </div>
        <div>
          {faq.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
