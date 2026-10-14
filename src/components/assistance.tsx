"use client";
import { useEffect, useRef, useState } from "react";
import { useWalletAccess } from "./wallet-access";
import { useAccount } from "./account-provider";
import { useWalletConnection } from "@solana/react-hooks";
import { Conversation } from "@elevenlabs/client";
import { draftSchema, type Draft } from "@/domain/bounty";
import { api } from "./header";
import { Banner, Button, Icon } from "./ui";
import { VoiceStage, transcriptMessages } from "./voice-stage";
type Proposal = Omit<Draft, "reward"> & { reward?: string };
const proposalSchema = draftSchema.omit({ reward: true });
type VoiceSession = {
  token: number;
  completed: boolean;
  events: Set<string>;
  speaking: boolean;
  lastUser: string;
  finishAudio?: () => void;
  active: Awaited<ReturnType<typeof Conversation.startSession>> | null;
};
export function DraftAssistant({
  onApply,
  draft,
  getDraftRevision,
}: {
  onApply: (proposal: Proposal) => void;
  draft?: Draft;
  getDraftRevision?: () => number;
}) {
  const walletReady = useWalletAccess();
  const { me } = useAccount();
  const { wallet } = useWalletConnection();
  const identity = `${me?.user.id || ""}:${wallet?.account.address || ""}`;
  const [text, setText] = useState("");
  const transcript = useRef("");
  const voiceReward = useRef("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [status, setStatus] = useState("disconnected");
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [editing, setEditing] = useState(true);
  const chat = useRef<HTMLDivElement>(null);
  const followChat = useRef(true);
  useEffect(() => {
    if (chat.current && followChat.current)
      chat.current.scrollTop = chat.current.scrollHeight;
  }, [text, editing]);
  const [enabled, setEnabled] = useState({
    aiEnabled: false,
    voiceEnabled: false,
  });
  const session = useRef<VoiceSession | null>(null);
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  // Read current access and form values even inside SDK callbacks and pending requests.
  const current = useRef({
    walletReady,
    identity,
    draft,
    onApply,
    getDraftRevision,
  });
  current.current = { walletReady, identity, draft, onApply, getDraftRevision };
  function writeText(value: string) {
    transcript.current = value;
    setText(value);
  }
  function invalidate() {
    generation.current++;
    setSpeaking(false);
    request.current?.abort();
    request.current = null;
    const old = session.current;
    session.current = null;
    void old?.active?.endSession().catch(() => {});
  }
  useEffect(() => {
    let alive = true;
    api<typeof enabled>("/api/health")
      .then((v) => {
        if (alive) setEnabled(v);
      })
      .catch(() => {});
    return () => {
      alive = false;
      invalidate();
    };
  }, []);
  useEffect(() => {
    invalidate();
    setPending(false);
    setStatus("disconnected");
    setMuted(false);
    setProposal(null);
    voiceReward.current = "";
    setPhase("idle");
  }, [identity, walletReady]);
  useEffect(() => {
    const changed = () => {
      void stop();
      setProposal(null);
    };
    window.addEventListener("bountini-auth-change", changed);
    window.addEventListener("bountini-account-change", changed);
    window.addEventListener("pagehide", changed);
    return () => {
      window.removeEventListener("bountini-auth-change", changed);
      window.removeEventListener("bountini-account-change", changed);
      window.removeEventListener("pagehide", changed);
    };
  }, []);
  const valid = (token: number, owner: string) =>
    generation.current === token &&
    current.current.walletReady &&
    current.current.identity === owner;
  async function closeVoice(voice: VoiceSession | null) {
    // Leave callbacks valid through shutdown, so the final transcription can be delivered.
    if (voice?.speaking) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 10000);
        voice.finishAudio = () => {
          clearTimeout(timer);
          resolve();
        };
      });
    }
    await voice?.active?.endSession();
    if (session.current === voice) session.current = null;
  }
  async function stop() {
    invalidate();
    setStatus("disconnected");
    setMuted(false);
    setPending(false);
    setPhase("idle");
  }
  function applyProposal(value: Proposal) {
    const { reward, ...brief } = value;
    current.current.onApply({
      ...brief,
      ...(!current.current.draft?.reward.trim() && reward ? { reward } : {}),
    });
  }
  async function generate(
    token: number,
    owner: string,
    automatic: boolean,
    voice: VoiceSession | null,
    finalAnswer = "",
  ) {
    const snapshot = JSON.stringify(current.current.draft);
    const revision = current.current.getDraftRevision?.();
    const existing = current.current.draft;
    const occupied = Boolean(
      existing &&
      (existing.title.trim() ||
        existing.description.trim() ||
        existing.requirements.some((r) => r.trim()) ||
        existing.category !== "Translation"),
    );
    setPending(true);
    setPhase("preparing");
    setError("");
    const controller = new AbortController();
    request.current = controller;
    try {
      await closeVoice(voice);
      if (!valid(token, owner)) return;
      setStatus("disconnected");
      setMuted(false);
      // The tool carries the final user turn as a fallback if its transcript event
      // was delayed by shutdown. It never acts as a completion signal itself.
      if (finalAnswer && voice?.lastUser.trim() !== finalAnswer.trim())
        writeText(`${transcript.current}\nYou: ${finalAnswer}`.trim());
      if (transcript.current.length > 6000)
        throw new Error(
          "Your transcript is preserved. Shorten it to 6,000 characters and retry, or edit the quest manually.",
        );
      const confirmedReward = voiceReward.current;
      if (
        confirmedReward &&
        !draftSchema.shape.reward.safeParse(confirmedReward).success
      ) {
        voiceReward.current = "";
        throw new Error(
          "The spoken reward was invalid. Enter a positive SOL amount with at most 9 decimal places in the reward field, then retry the draft.",
        );
      }
      const response = await api<{ result: unknown }>("/api/ai/draft", {
        method: "POST",
        body: JSON.stringify({ text: transcript.current }),
        signal: controller.signal,
      });
      if (!valid(token, owner)) return;
      const parsed = proposalSchema.safeParse(response.result);
      if (!parsed.success)
        throw new Error(
          "The generated draft was incomplete. Your transcript is preserved; retry or edit the quest manually.",
        );
      const generated: Proposal = {
        ...parsed.data,
        ...(confirmedReward ? { reward: confirmedReward } : {}),
      };
      if (
        automatic &&
        !occupied &&
        snapshot === JSON.stringify(current.current.draft) &&
        revision === current.current.getDraftRevision?.()
      ) {
        applyProposal(generated);
        setProposal(null);
        setPhase("ready");
      } else {
        setProposal(generated);
        setPhase("proposal");
      }
    } catch (e) {
      if (!valid(token, owner)) return;
      setError(
        e instanceof Error
          ? e.message
          : "Assistance unavailable. Your transcript is preserved; retry or continue manually.",
      );
      setPhase("failure");
    } finally {
      if (valid(token, owner)) {
        setPending(false);
        setStatus("disconnected");
        request.current = null;
      }
    }
  }
  async function start() {
    if (!current.current.walletReady) return;
    invalidate();
    setProposal(null);
    setError("");
    voiceReward.current = "";
    setStatus("connecting");
    setEditing(false);
    followChat.current = true;
    setMuted(false);
    setPhase("listening");
    const token = generation.current;
    const owner = current.current.identity;
    const voice: VoiceSession = {
      token,
      completed: false,
      events: new Set(),
      speaking: false,
      lastUser: "",
      active: null,
    };
    session.current = voice;
    try {
      const { signedUrl } = await api<{ signedUrl: string }>(
        "/api/voice/session",
        { method: "POST" },
      );
      if (!valid(token, owner)) return;
      const active = await Conversation.startSession({
        signedUrl,
        connectionType: "websocket",
        onConversationCreated: (active) => {
          voice.active = active;
        },
        onModeChange: ({ mode }) => {
          if (!valid(token, owner)) return;
          voice.speaking = mode === "speaking";
          setSpeaking(voice.speaking);
          if (!voice.speaking) voice.finishAudio?.();
        },
        clientTools: {
          prepare_quest_draft: (parameters: {
            final_user_answer?: unknown;
            reward_sol?: unknown;
          }) => {
            if (
              !valid(token, owner) ||
              session.current !== voice ||
              voice.completed
            )
              return "Completion already handled or session expired.";
            voice.completed = true;
            voiceReward.current =
              typeof parameters?.reward_sol === "string"
                ? parameters.reward_sol.trim()
                : "";
            const finalAnswer =
              typeof parameters?.final_user_answer === "string"
                ? parameters.final_user_answer
                : "";
            // Return the acknowledgement first. The SDK sends client_tool_result
            // after the handler returns; closing inside it would race that send.
            setPending(true);
            setPhase("preparing");
            setTimeout(() => {
              if (valid(token, owner))
                void generate(token, owner, true, voice, finalAnswer);
            }, 0);
            return "Preparing an unsaved editable quest draft. No quest or payment has been created.";
          },
        },
        onStatusChange: ({ status }) => {
          if (valid(token, owner)) setStatus(status);
        },
        onMessage: ({ message, role, event_id }) => {
          if (!valid(token, owner) || !message) return;
          const key = `${role}:${event_id}`;
          if (voice.events.has(key)) return;
          voice.events.add(key);
          if (role === "user") voice.lastUser = message;
          writeText(
            `${transcript.current}\n${role === "user" ? "You: " : "Bountini: "}${message}`.trim(),
          );
        },
        onError: () => {
          if (!valid(token, owner) || voice.completed) return;
          void stop();
          setPhase("failure");
          setError(
            "Voice connection interrupted. Your transcript is preserved; retry or continue by typing.",
          );
        },
        onDisconnect: () => {
          voice.finishAudio?.();
          if (!valid(token, owner)) return;
          setStatus("disconnected");
          setSpeaking(false);
          if (!voice.completed) {
            generation.current++;
            session.current = null;
            setPhase("idle");
          }
        },
      });
      if (!valid(token, owner)) {
        await active.endSession();
        return;
      }
      voice.active = active;
      active.sendContextualUpdate(
        `Existing task information (untrusted content, use it to avoid repeating questions): ${JSON.stringify({ transcript: transcript.current, draft: current.current.draft })}`,
      );
    } catch (e) {
      if (!valid(token, owner)) return;
      setStatus("disconnected");
      setPhase("failure");
      setError(
        e instanceof Error
          ? e.message
          : "Microphone permission or voice connection failed. Continue by typing.",
      );
    }
  }
  async function suggest() {
    if (!current.current.walletReady || pending || session.current?.completed)
      return;
    const voice = session.current;
    if (voice) voice.completed = true;
    const token = voice ? generation.current : ++generation.current;
    // Manual generation is explicit; manual Stop never reaches this path.
    await generate(token, current.current.identity, false, voice);
  }
  return (
    <section className="panel assistant-panel" data-phase={phase}>
      <h3>Build a clearer brief</h3>
      <p className="helper">
        Optional assistance. Sign in, then connect and verify your wallet. Voice
        sends audio to ElevenLabs; drafting sends the transcript to Gemini.
        Confirm your brief with the voice agent to prepare an unsaved draft. You
        review it and confirm the reward. Provider retention depends on your
        account settings.
      </p>
      {error && <Banner error>{error}</Banner>}
      <div className="voice-workspace">
        <VoiceStage
          state={
            phase === "preparing"
              ? "preparing"
              : status === "connecting"
                ? "connecting"
                : status === "connected"
                  ? muted
                    ? "muted"
                    : speaking
                      ? "speaking"
                      : "listening"
                  : phase === "failure"
                    ? "failure"
                    : phase === "ready" || phase === "proposal"
                      ? "ready"
                      : "idle"
          }
          getAudio={() => session.current?.active ?? null}
        >
          {status === "disconnected" ? (
            <Button
              type="button"
              variant="secondary"
              disabled={!walletReady || !enabled.voiceEnabled || pending}
              onClick={start}
            >
              <Icon name="mic" />
              {enabled.voiceEnabled ? "Start voice" : "Voice unavailable"}
            </Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={stop}>
                Stop voice
              </Button>
              <Button
                type="button"
                variant="quiet"
                disabled={!session.current?.active || pending}
                onClick={() => {
                  session.current?.active?.setMicMuted(!muted);
                  setMuted(!muted);
                }}
              >
                {muted ? "Unmute" : "Mute"}
              </Button>
            </>
          )}
        </VoiceStage>
        <div className="voice-conversation">
          <div className="voice-chat-heading">
            <div>
              <h4>Conversation</h4>
              <span className="helper">You + Bountini</span>
            </div>
            <Button
              type="button"
              variant="quiet"
              disabled={status !== "disconnected" || pending}
              onClick={() => {
                setEditing(!editing);
                followChat.current = true;
              }}
            >
              {editing
                ? "View conversation"
                : text
                  ? "Edit transcript"
                  : "Type your task"}
            </Button>
          </div>
          <div
            hidden={editing}
            className="voice-chat"
            ref={chat}
            role="log"
            aria-label="Conversation transcript"
            aria-live="polite"
            aria-relevant="additions text"
            onScroll={() => {
              const node = chat.current;
              if (node)
                followChat.current =
                  node.scrollHeight - node.scrollTop - node.clientHeight < 48;
            }}
          >
            {text ? (
              transcriptMessages(text).map((message, index) => (
                <div key={index} className={`voice-message ${message.role}`}>
                  <span>{message.role === "user" ? "You" : "Bountini"}</span>
                  <p>{message.content}</p>
                </div>
              ))
            ) : (
              <div className="voice-chat-empty">
                <Icon name="mic" />
                <strong>Let’s shape your brief</strong>
                <p>
                  Start voice and tell Bountini about your task. Your
                  conversation will appear here.
                </p>
              </div>
            )}
          </div>
          <div className="field voice-editor" hidden={!editing}>
            <label htmlFor="assistant-input">
              Describe your task or edit your transcript
            </label>
            <textarea
              id="assistant-input"
              value={text}
              readOnly={status !== "disconnected" || pending}
              placeholder="Describe what you need, who it’s for, and what a successful result looks like…"
              maxLength={6000}
              onChange={(e) => {
                writeText(e.target.value);
                voiceReward.current = "";
                setProposal(null);
                if (pending) {
                  invalidate();
                  setPending(false);
                  setStatus("disconnected");
                }
                setPhase("idle");
              }}
            />
            <span className="helper">
              {text.length.toLocaleString()} / 6,000 characters · Edits are used
              for your next draft.
            </span>
          </div>
          {status !== "disconnected" && (
            <p className="helper voice-chat-note">
              Live transcript · Stop voice to edit your conversation.
            </p>
          )}
        </div>
      </div>
      <div className="actions">
        <Button
          type="button"
          disabled={
            !walletReady ||
            !enabled.aiEnabled ||
            text.trim().length < 20 ||
            pending
          }
          pending={pending}
          onClick={suggest}
        >
          Suggest requirements
        </Button>
        {phase === "failure" && (
          <Button
            type="button"
            variant="secondary"
            disabled={
              !walletReady ||
              !enabled.aiEnabled ||
              text.trim().length < 20 ||
              pending
            }
            onClick={suggest}
          >
            Retry draft
          </Button>
        )}
        <Button
          type="button"
          variant="quiet"
          onClick={() => {
            void stop();
            writeText("");
            setEditing(true);
            followChat.current = true;
            voiceReward.current = "";
            setProposal(null);
            setError("");
          }}
        >
          Clear transcript
        </Button>
      </div>
      <p role="status" className="helper">
        {phase === "preparing"
          ? "Preparing your quest draft…"
          : phase === "ready"
            ? "Your quest draft is ready. Review the details and set your reward."
            : phase === "proposal"
              ? "Your proposal is ready to review. Your existing draft and edits have been preserved."
              : status === "connecting"
                ? "Connecting microphone…"
                : status === "connected"
                  ? muted
                    ? "Microphone muted"
                    : speaking
                      ? "Bountini is speaking · You can interrupt to add a detail"
                      : "Listening · Confirm completion to prepare your quest"
                  : "You can type at any time."}
        {!enabled.aiEnabled &&
          " AI assistance is not configured. Use the manual form below."}
      </p>
      {proposal && (
        <div className="assistant-proposal">
          <h3>{proposal.title}</h3>
          <p className="submission-text">{proposal.description}</p>
          {proposal.reward && (
            <p className="helper">
              Confirmed voice reward: {proposal.reward} test SOL. Existing
              reward entries are preserved.
            </p>
          )}
          <ul>
            {proposal.requirements.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <Button
            type="button"
            disabled={!walletReady}
            onClick={() => {
              applyProposal(proposal);
              setProposal(null);
              setPhase("ready");
            }}
          >
            Apply editable proposal
          </Button>
          <p className="helper">
            Applying replaces the brief fields. Your reward is preserved. Review
            all fields before saving or funding.
          </p>
        </div>
      )}
    </section>
  );
}
export function AdvisoryReview({
  bountyId,
  eligible = true,
}: {
  bountyId: string;
  eligible?: boolean;
}) {
  const walletReady = useWalletAccess();
  const { me } = useAccount();
  const { wallet } = useWalletConnection();
  const identity = `${bountyId}:${me?.user.id}:${wallet?.account.address}:${walletReady}:${eligible}`;
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;
  const generation = useRef(0);
  const active = useRef(true);
  const [result, setResult] = useState<{
    summary: string;
    criteria: {
      criterion: string;
      evidence: string;
      concern: string;
      suggestedRevision: string;
    }[];
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [trace, setTrace] = useState("");
  const [materials, setMaterials] = useState<
    { label: string; status: string; detail: string }[]
  >([]);
  useEffect(() => {
    active.current = true;
    setResult(null);
    setMaterials([]);
    setTrace("");
    setPending(false);
    const invalidate = () => {
      generation.current++;
      setResult(null);
      setMaterials([]);
      setTrace("");
      setPending(false);
    };
    window.addEventListener("bountini-auth-change", invalidate);
    return () => {
      active.current = false;
      generation.current++;
      window.removeEventListener("bountini-auth-change", invalidate);
    };
  }, [identity]);
  async function review() {
    if (!walletReady || !eligible) return;
    const owner = identity,
      token = ++generation.current;
    const valid = () =>
      active.current &&
      token === generation.current &&
      currentIdentity.current === owner;
    setPending(true);
    setError("");
    try {
      const r = await api<{
        result: NonNullable<typeof result>;
        model: string;
        createdAt: string;
        requirementsHash: string;
        materials: typeof materials;
      }>("/api/ai/review", {
        method: "POST",
        body: JSON.stringify({ bountyId }),
      });
      if (!valid()) return;
      setResult(r.result);
      setMaterials(r.materials || []);
      setTrace(`${r.model} · ${r.createdAt} · agreement ${r.requirementsHash}`);
    } catch (e) {
      if (!valid()) return;
      setError(
        e instanceof Error ? e.message : "Review unavailable. Review manually.",
      );
    } finally {
      if (valid()) setPending(false);
    }
  }
  return (
    <section className="panel">
      <h3>Advisory review</h3>
      <p className="helper">
        Requesting feedback sends the brief, written response and supported
        private attachments from the latest confirmed submission to Gemini.
        Selecting an older version does not change Gemini’s input. Link
        destinations are not fetched. You decide approval, revision or
        rejection. The review deadline continues while AI runs.
      </p>
      {(!walletReady || !eligible) && (
        <p className="helper">
          Connect and verify your participant wallet in the header to request AI
          review.
        </p>
      )}
      <Button
        type="button"
        variant="secondary"
        pending={pending}
        disabled={!walletReady || !eligible}
        onClick={review}
      >
        Review against checklist
      </Button>
      {error && <Banner error>{error}</Banner>}
      {result && (
        <>
          <p>{result.summary}</p>
          <h4>Materials supplied and limitations</h4>
          <ul className="rv-materials">
            {materials.map((m, i) => (
              <li key={i}>
                <strong>{m.label}</strong> ·{" "}
                {m.status === "supplied"
                  ? "Supplied to Gemini"
                  : "Not assessed"}
                <p className="helper">{m.detail}</p>
              </li>
            ))}
          </ul>
          {result.criteria.map((c, i) => (
            <div key={i} className="rv-criterion">
              <h4>{c.criterion}</h4>
              <p>Evidence: {c.evidence}</p>
              <p>Concern: {c.concern}</p>
              <p>Suggested revision: {c.suggestedRevision}</p>
            </div>
          ))}
          <details>
            <summary>Advisory evidence record</summary>
            <p className="helper address">{trace}</p>
          </details>
        </>
      )}
    </section>
  );
}
