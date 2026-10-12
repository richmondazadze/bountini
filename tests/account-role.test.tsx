// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  AccountProvider,
  useAccount,
  type Me,
} from "../src/components/account-provider";
let account: ReturnType<typeof useAccount>;
function Probe() {
  account = useAccount();
  return (
    <div>
      {account.me?.profile.activeRole}
      {account.roleError}
    </div>
  );
}
const me = (
  id = "owner",
  activeRole: "requester" | "worker" = "requester",
): Me => ({
  user: { id, name: "Owner", email: "owner@example.test" },
  profile: { activeRole, bio: "", skills: [], portfolioUrl: "" },
  wallets: [],
});
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.useFakeTimers();
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function mount() {
  await act(async () =>
    root.render(
      <AccountProvider>
        <Probe />
      </AccountProvider>,
    ),
  );
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}
it("persists the role on the API and restores it on remount without wallet activity", async () => {
  let saved = me();
  const fetcher = vi.fn(async (_url, init) => {
    if (init?.method === "PATCH") {
      saved = me("owner", JSON.parse(init.body).activeRole);
      return Response.json({ saved: true });
    }
    return Response.json(saved);
  });
  vi.stubGlobal("fetch", fetcher);
  await mount();
  await act(async () => account.switchRole("worker"));
  expect(account.me?.profile.activeRole).toBe("worker");
  expect(account.roleNotice).toContain("Worker workspace saved");
  expect(fetcher.mock.calls[1][1].body).toBe('{"activeRole":"worker"}');
  await act(async () => root.render(null));
  await mount();
  expect(account.me?.profile.activeRole).toBe("worker");
  expect(fetcher.mock.calls.every(([url]) => url === "/api/me")).toBe(true);
});
it("keeps the previous role on failure and permits a retry", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(me()))
    .mockResolvedValueOnce(
      Response.json({ error: "Save failed" }, { status: 500 }),
    )
    .mockResolvedValueOnce(Response.json({ saved: true }));
  vi.stubGlobal("fetch", fetcher);
  await mount();
  await act(async () => account.switchRole("worker"));
  expect(account.me?.profile.activeRole).toBe("requester");
  expect(account.roleError).toBe("Save failed");
  expect(account.rolePending).toBe(false);
  await act(async () => account.switchRole("worker"));
  expect(account.me?.profile.activeRole).toBe("worker");
  expect(account.roleError).toBe("");
});
it("serializes repeated switches and never displays a role before persistence", async () => {
  const patch = deferred<Response>();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(me()))
    .mockReturnValueOnce(patch.promise);
  vi.stubGlobal("fetch", fetcher);
  await mount();
  let first!: Promise<void>;
  await act(async () => {
    first = account.switchRole("worker");
  });
  expect(account.rolePending).toBe(true);
  expect(account.me?.profile.activeRole).toBe("requester");
  await act(async () => account.switchRole("worker"));
  expect(fetcher).toHaveBeenCalledTimes(2);
  await act(async () => {
    patch.resolve(Response.json({ saved: true }));
    await first;
  });
  expect(account.rolePending).toBe(false);
});
it("discards a pre-switch refresh response instead of resetting the saved role", async () => {
  const old = deferred<Response>();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(me()))
    .mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce(Response.json({ saved: true }));
  vi.stubGlobal("fetch", fetcher);
  await mount();
  let refreshing!: Promise<void>;
  await act(async () => {
    refreshing = account.refresh();
  });
  await act(async () => account.switchRole("worker"));
  await act(async () => {
    old.resolve(Response.json(me()));
    await refreshing;
  });
  expect(account.me?.profile.activeRole).toBe("worker");
});
it("ignores a pending role response after account identity changes", async () => {
  const patch = deferred<Response>();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(me()))
    .mockReturnValueOnce(patch.promise)
    .mockResolvedValueOnce(Response.json(me("other")));
  vi.stubGlobal("fetch", fetcher);
  await mount();
  let saving!: Promise<void>;
  await act(async () => {
    saving = account.switchRole("worker");
  });
  await act(async () => account.refresh());
  await act(async () => {
    patch.resolve(Response.json({ saved: true }));
    await saving;
  });
  expect(account.me?.user.id).toBe("other");
  expect(account.me?.profile.activeRole).toBe("requester");
  expect(account.rolePending).toBe(false);
  expect(account.roleNotice).toBe("");
});
it("leaves anonymous users public and does not attempt a role mutation", async () => {
  const fetcher = vi.fn(async () =>
    Response.json({ error: "Sign in" }, { status: 401 }),
  );
  vi.stubGlobal("fetch", fetcher);
  await mount();
  await act(async () => account.switchRole("worker"));
  expect(account.me).toBeNull();
  expect(account.loading).toBe(false);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
