// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi, type Mock } from "vitest";
import type { Draft } from "../src/domain/bounty";
const m = vi.hoisted(() => ({
  ready: true,
  revision: 0,
  owner: "requester",
  wallet: "wallet-one",
  api: vi.fn(),
  start: vi.fn(),
}));
vi.mock("../src/components/wallet-access", () => ({
  useWalletAccess: () => m.ready,
}));
vi.mock("../src/components/account-provider", () => ({
  useAccount: () => ({ me: { user: { id: m.owner } } }),
}));
vi.mock("@solana/react-hooks", () => ({
  useWalletConnection: () => ({ wallet: { account: { address: m.wallet } } }),
}));
vi.mock("../src/components/header", () => ({ api: m.api }));
vi.mock("@elevenlabs/client", () => ({
  Conversation: { startSession: m.start },
}));
vi.mock("../src/components/ui", () => ({
  Banner: ({ children }: any) => <div>{children}</div>,
  Icon: () => null,
  Button: ({ children, pending, variant, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));
import { DraftAssistant } from "../src/components/assistance";
let root: Root,
  host: HTMLDivElement,
  options: any,
  applied: Mock<
    (proposal: Omit<Draft, "reward"> & { reward?: string }) => void
  >,
  form: Draft,
  active: any;
const result = {
  title: "Translate the announcement",
  description:
    "Translate the complete announcement into Spanish with all dates preserved.",
  category: "Translation",
  requirements: ["Preserve every URL and date."],
};
function render() {
  root.render(
    <DraftAssistant
      draft={form}
      getDraftRevision={() => m.revision}
      onApply={applied}
    />,
  );
}
function button(label: string) {
  return [...host.querySelectorAll("button")].find(
    (b) => b.textContent === label,
  )!;
}
async function start() {
  await act(async () => button("Start voice").click());
  await act(async () =>
    options.onMessage({
      message: "Translate my announcement into Spanish and preserve all dates.",
      role: "user",
      event_id: 1,
    }),
  );
}
async function complete() {
  await act(async () => {
    options.clientTools.prepare_quest_draft({
      final_user_answer: "Yes, and preserve the link too.",
    });
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
}
const requests = () =>
  m.api.mock.calls.filter(([path]) => path === "/api/ai/draft");
beforeEach(async () => {
  vi.useFakeTimers();
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  m.ready = true;
  m.revision = 0;
  m.owner = "requester";
  m.wallet = "wallet-one";
  form = {
    title: "",
    description: "",
    category: "Translation",
    requirements: [""],
    reward: "0.25",
  };
  applied = vi.fn((proposal) => {
    form = { ...form, ...proposal };
  });
  m.api
    .mockReset()
    .mockImplementation(async (path) =>
      path === "/api/health"
        ? { aiEnabled: true, voiceEnabled: true }
        : path === "/api/voice/session"
          ? { signedUrl: "wss://api.elevenlabs.io/test" }
          : { result },
    );
  active = {
    endSession: vi.fn(async () => {
      options.onStatusChange({ status: "disconnected" });
      options.onDisconnect();
    }),
    sendContextualUpdate: vi.fn(),
    setMicMuted: vi.fn(),
  };
  m.start.mockReset().mockImplementation(async (o) => {
    options = o;
    o.onConversationCreated(active);
    o.onStatusChange({ status: "connected" });
    return active;
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => render());
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
});
it("fills an empty form automatically, preserving reward and the final answer, once per session", async () => {
  await start();
  await act(async () => {
    options.clientTools.prepare_quest_draft({
      final_user_answer: "Yes, and preserve the link too.",
    });
    options.clientTools.prepare_quest_draft({ final_user_answer: "duplicate" });
    options.onMessage({
      message: "Yes, and preserve the link too.",
      role: "user",
      event_id: 2,
    });
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(requests()).toHaveLength(1);
  expect(JSON.parse(requests()[0][1].body).text).toContain(
    "Yes, and preserve the link too.",
  );
  expect(applied).toHaveBeenCalledOnce();
  expect(form.reward).toBe("0.25");
  expect(host.textContent).toContain(
    "Your quest draft is ready. Review the details and set your reward.",
  );
});
it("waits for closing audio and includes transcription delivered during shutdown", async () => {
  await start();
  active.endSession.mockImplementation(async () => {
    options.onMessage({
      message: "Include accents correctly.",
      role: "user",
      event_id: 3,
    });
    options.onDisconnect();
  });
  await act(async () => options.onModeChange({ mode: "speaking" }));
  await complete();
  expect(requests()).toHaveLength(0);
  await act(async () => options.onModeChange({ mode: "listening" }));
  expect(JSON.parse(requests()[0][1].body).text).toContain(
    "Include accents correctly.",
  );
});
it("manual stopping or disconnection never generates a draft", async () => {
  await start();
  await act(async () => options.onDisconnect());
  expect(requests()).toHaveLength(0);
  await start();
  await act(async () => button("Stop voice").click());
  await act(async () =>
    options.clientTools.prepare_quest_draft({ final_user_answer: "stale" }),
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(requests()).toHaveLength(0);
});
it("offers a proposal without overwriting an existing draft", async () => {
  form = { ...form, title: "My existing draft" };
  await act(async () => render());
  await start();
  await complete();
  expect(applied).not.toHaveBeenCalled();
  expect(form.title).toBe("My existing draft");
  await act(async () => button("Apply editable proposal").click());
  expect(form.title).toBe(result.title);
  expect(form.reward).toBe("0.25");
});
it("offers a proposal if the form changes while Gemini is pending", async () => {
  let resolve!: (v: any) => void;
  m.api.mockImplementation(async (path) =>
    path === "/api/health"
      ? { aiEnabled: true, voiceEnabled: true }
      : path === "/api/voice/session"
        ? { signedUrl: "wss://api.elevenlabs.io/test" }
        : new Promise((r) => {
            resolve = r;
          }),
  );
  await start();
  await complete();
  form = { ...form, title: "My newer title", reward: "0.7" };
  await act(async () => render());
  await act(async () => resolve({ result }));
  expect(applied).not.toHaveBeenCalled();
  expect(form.reward).toBe("0.7");
  expect(host.textContent).toContain(
    "Your existing draft and edits have been preserved",
  );
});
it("preserves transcript after failure and permits explicit retry", async () => {
  await start();
  m.api.mockRejectedValueOnce(new Error("Gemini temporarily unavailable"));
  await complete();
  expect(
    (host.querySelector("textarea") as HTMLTextAreaElement).value,
  ).toContain("preserve the link");
  expect(host.textContent).toContain("Gemini temporarily unavailable");
  await act(async () => button("Retry draft").click());
  expect(requests()).toHaveLength(2);
  expect(button("Apply editable proposal")).toBeTruthy();
});
it("rejects an invalid Gemini result before applying it", async () => {
  await start();
  m.api.mockResolvedValueOnce({ result: { title: "bad" } });
  await complete();
  expect(applied).not.toHaveBeenCalled();
  expect(host.textContent).toContain("generated draft was incomplete");
});
for (const change of ["account", "wallet", "access", "unmount"] as const)
  it(`ignores a stale generation after ${change} changes`, async () => {
    let resolve!: (v: any) => void;
    await start();
    m.api.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    await complete();
    if (change === "account") m.owner = "replacement";
    if (change === "wallet") m.wallet = "wallet-two";
    if (change === "access") m.ready = false;
    await act(async () =>
      change === "unmount" ? root.render(null) : render(),
    );
    await act(async () => resolve({ result }));
    expect(applied).not.toHaveBeenCalled();
  });
it("typed task creation and manual suggestions remain available", async () => {
  await act(async () => {
    const textarea = host.querySelector("textarea")!;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!;
    setter.call(
      textarea,
      "Translate the supplied announcement into Spanish and preserve dates.",
    );
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(
    (host.querySelector("textarea") as HTMLTextAreaElement).value,
  ).toContain("supplied announcement");
  expect(button("Suggest requirements").disabled).toBe(false);
  await act(async () => button("Suggest requirements").click());
  expect(m.start).not.toHaveBeenCalled();
  expect(requests()).toHaveLength(1);
  expect(applied).not.toHaveBeenCalled();
  expect(button("Apply editable proposal")).toBeTruthy();
});
it("ignores a replacement session's predecessor and accepts fresh event IDs", async () => {
  await start();
  const old = options;
  await act(async () => button("Stop voice").click());
  await start();
  await act(async () =>
    old.clientTools.prepare_quest_draft({ final_user_answer: "stale" }),
  );
  await complete();
  expect(requests()).toHaveLength(1);
  expect(
    JSON.parse(requests()[0][1].body).text.match(/Translate my announcement/g),
  ).toHaveLength(2);
});
it("cancels pending results immediately on authentication events", async () => {
  let resolve!: (value: any) => void;
  await start();
  m.api.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  await complete();
  await act(async () =>
    window.dispatchEvent(new Event("bountini-auth-change")),
  );
  await act(async () => resolve({ result }));
  expect(applied).not.toHaveBeenCalled();
});

it("preserves edits even when fields are restored to their original values", async () => {
  let resolve!: (value: any) => void;
  await start();
  m.api.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  await complete();
  m.revision += 2;
  await act(async () => render());
  await act(async () => resolve({ result }));
  expect(applied).not.toHaveBeenCalled();
  expect(button("Apply editable proposal")).toBeTruthy();
});

it("fills an empty reward with the explicitly confirmed voice amount", async () => {
  form = { ...form, reward: "" };
  await act(async () => render());
  await start();
  await act(async () =>
    options.clientTools.prepare_quest_draft({
      final_user_answer: "Yes, 0.125 SOL is correct.",
      reward_sol: "0.125",
    }),
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(form.reward).toBe("0.125");
  expect(applied).toHaveBeenCalledOnce();
});
it("preserves an existing reward even if voice proposes another amount", async () => {
  await start();
  await act(async () =>
    options.clientTools.prepare_quest_draft({
      final_user_answer: "Yes, 0.9 SOL.",
      reward_sol: "0.9",
    }),
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(form.reward).toBe("0.25");
});
it("preserves a concurrent reward edit when applying the generated proposal", async () => {
  let resolve!: (value: any) => void;
  form = { ...form, reward: "" };
  await act(async () => render());
  await start();
  m.api.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  await act(async () =>
    options.clientTools.prepare_quest_draft({
      final_user_answer: "Confirmed",
      reward_sol: "0.8",
    }),
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  form = { ...form, reward: "0.6" };
  m.revision++;
  await act(async () => render());
  await act(async () => resolve({ result }));
  expect(applied).not.toHaveBeenCalled();
  await act(async () => button("Apply editable proposal").click());
  expect(form.reward).toBe("0.6");
});
it("retains a confirmed reward through generation failure and retry", async () => {
  form = { ...form, reward: "" };
  await act(async () => render());
  await start();
  m.api.mockRejectedValueOnce(new Error("temporary failure"));
  await act(async () =>
    options.clientTools.prepare_quest_draft({
      final_user_answer: "Confirmed",
      reward_sol: "0.45",
    }),
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  await act(async () => button("Retry draft").click());
  await act(async () => button("Apply editable proposal").click());
  expect(form.reward).toBe("0.45");
});
for (const amount of ["0", "-1", "0.0000000001", "1e2", "100000000000"])
  it(`rejects invalid voice reward ${amount} without generating`, async () => {
    await start();
    await act(async () =>
      options.clientTools.prepare_quest_draft({
        final_user_answer: "Confirmed",
        reward_sol: amount,
      }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(requests()).toHaveLength(0);
    expect(applied).not.toHaveBeenCalled();
    expect(host.textContent).toContain("spoken reward was invalid");
    await act(async () => button("Retry draft").click());
    expect(requests()).toHaveLength(1);
  });
it("leaves the reward empty when the requester chooses to decide later", async () => {
  form = { ...form, reward: "" };
  await act(async () => render());
  await start();
  await act(async () =>
    options.clientTools.prepare_quest_draft({
      final_user_answer: "I'll decide the reward later",
      reward_sol: "",
    }),
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(form.reward).toBe("");
  expect(applied).toHaveBeenCalledOnce();
});

it("shows live speaker bubbles and locks transcript editing during voice", async () => {
  await start();
  await act(async () =>
    options.onMessage({
      role: "agent",
      message: "Who is the audience?",
      event_id: 8,
    }),
  );
  expect(host.querySelectorAll(".voice-message")).toHaveLength(2);
  expect(host.querySelector(".voice-message.agent")?.textContent).toContain(
    "Who is the audience?",
  );
  expect(button("Edit transcript").disabled).toBe(true);
  expect(host.querySelector(".voice-stage")?.getAttribute("data-state")).toBe(
    "listening",
  );
  await act(async () => options.onModeChange({ mode: "speaking" }));
  expect(host.querySelector(".voice-stage")?.getAttribute("data-state")).toBe(
    "speaking",
  );
  await act(async () => button("Mute").click());
  expect(host.querySelector(".voice-stage")?.getAttribute("data-state")).toBe(
    "muted",
  );
  await act(async () => button("Stop voice").click());
  expect(button("Edit transcript").disabled).toBe(false);
  await act(async () => button("Edit transcript").click());
  expect(host.querySelector(".voice-editor")?.hasAttribute("hidden")).toBe(
    false,
  );
  expect(host.querySelector("textarea")?.readOnly).toBe(false);
  await act(async () => options.onModeChange({ mode: "speaking" }));
  expect(host.querySelector(".voice-stage")?.getAttribute("data-state")).toBe(
    "idle",
  );
});

it("clears bubbles and returns to typing without generating a draft", async () => {
  await start();
  await act(async () => button("Clear transcript").click());
  expect(host.querySelectorAll(".voice-message")).toHaveLength(0);
  expect(host.querySelector("textarea")?.value).toBe("");
  expect(host.querySelector(".voice-editor")?.hasAttribute("hidden")).toBe(
    false,
  );
  expect(requests()).toHaveLength(0);
});

it("drives the mic from real input/output levels and stops sampling when muted", async () => {
  active.getInputVolume = vi.fn(() => 0.1);
  active.getOutputVolume = vi.fn(() => 0.2);
  await start();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60);
  });
  const visual = host.querySelector(".voice-visual") as HTMLElement;
  expect(
    Number(visual.querySelector<HTMLElement>(".voice-halo")!.style.opacity),
  ).toBeGreaterThan(0.5);
  expect(active.getInputVolume).toHaveBeenCalled();
  await act(async () => options.onModeChange({ mode: "speaking" }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60);
  });
  expect(active.getOutputVolume).toHaveBeenCalled();
  await act(async () => button("Mute").click());
  const calls = active.getOutputVolume.mock.calls.length;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120);
  });
  expect(active.getOutputVolume).toHaveBeenCalledTimes(calls);
  expect(
    visual.querySelector<HTMLElement>(".voice-halo")!.style.transform,
  ).toBe("");
});
