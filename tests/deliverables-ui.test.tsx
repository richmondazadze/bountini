// @vitest-environment happy-dom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/components/header", () => ({ api: mocks.api }));
vi.mock("@/components/ui", () => ({
  Banner: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Button: ({
    children,
    pending,
    variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    pending?: boolean;
    variant?: string;
  }) => (
    <button {...props} disabled={props.disabled || pending}>
      {children}
    </button>
  ),
}));
import {
  DeliverableEditor,
  ConfirmedDeliverables,
  ManifestView,
} from "@/components/deliverables";
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, React });
  localStorage.clear();
  mocks.api.mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function click(label: string) {
  const button = Array.from(host.querySelectorAll("button")).find(
    (b) => b.textContent === label,
  )!;
  await act(async () => button.click());
}
it("offers a frozen summary only after server preparation and preserves drafts on preparation failure", async () => {
  const prepared = vi.fn();
  mocks.api.mockRejectedValueOnce(new Error("Storage unavailable"));
  await act(async () =>
    root.render(
      <DeliverableEditor
        id="quest"
        owner="worker"
        text="Completed written response"
        setText={() => {}}
        disabled={false}
        onPrepared={prepared}
      />,
    ),
  );
  await click("Review submission summary");
  expect(host.textContent).toContain("Storage unavailable");
  expect(host.querySelector<HTMLTextAreaElement>("#submission")!.value).toBe(
    "Completed written response",
  );
  expect(prepared).not.toHaveBeenCalled();
  const frozen = {
    id: "manifest",
    contentHash: "hash",
    manifest: { writtenResponse: "Completed written response" },
  };
  mocks.api.mockResolvedValue(frozen);
  await click("Review submission summary");
  expect(prepared).toHaveBeenCalledWith(frozen);
  expect(JSON.parse(mocks.api.mock.calls[0][1].body)).toMatchObject({
    writtenResponse: "Completed written response",
    attachmentIds: [],
    links: [],
  });
});
it("ignores a late prepared snapshot after changing accounts", async () => {
  let finish!: (value: unknown) => void;
  mocks.api.mockImplementation(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  const prepared = vi.fn();
  await act(async () =>
    root.render(
      <DeliverableEditor
        key="worker"
        id="quest"
        owner="worker"
        text="Worker private draft"
        setText={() => {}}
        disabled={false}
        onPrepared={prepared}
      />,
    ),
  );
  await click("Review submission summary");
  await act(async () =>
    root.render(
      <DeliverableEditor
        key="other"
        id="quest"
        owner="other"
        text=""
        setText={() => {}}
        disabled={false}
        onPrepared={prepared}
      />,
    ),
  );
  await act(async () => finish({ id: "private-snapshot" }));
  expect(prepared).not.toHaveBeenCalled();
  expect(host.textContent).not.toContain("Worker private draft");
});
it("renders links with labels and existing text-only original and revised submissions", async () => {
  mocks.api.mockResolvedValue({
    submissions: [
      { body: "Original work", revision: 0 },
      { body: "Revised work", revision: 1 },
    ],
  });
  await act(async () => root.render(<ConfirmedDeliverables id="quest" />));
  expect(host.textContent).toContain("Original work");
  expect(host.textContent).toContain("Revised work");
  await act(async () =>
    root.render(
      <ManifestView
        manifest={{
          format: "bountini-deliverables-v1",
          bountyId: "quest",
          version: 0,
          writtenResponse: "Finished work",
          links: [
            {
              label: "Repository commit",
              url: "https://example.org/commit/abc",
            },
          ],
          attachments: [],
        }}
      />,
    ),
  );
  expect(host.querySelector("a")!.textContent).toContain("Repository commit");
  expect(host.querySelector("a")!.getAttribute("rel")).toBe("noreferrer");
  expect(host.textContent).toContain("not their future contents");
});
it("shows indeterminate uploads until measured bytes arrive, then server validation without invented progress", async () => {
  let xhr: any;
  class UploadRequest {
    upload: any = {};
    status = 200;
    responseText = "";
    timeout = 0;
    onload: any;
    onerror: any;
    ontimeout: any;
    onloadend: any;
    constructor() {
      xhr = this;
    }
    open() {}
    send() {}
    abort() {}
  }
  vi.stubGlobal("XMLHttpRequest", UploadRequest);
  await act(async () =>
    root.render(
      <DeliverableEditor
        id="quest"
        owner="worker"
        text=""
        setText={() => {}}
        disabled={false}
        onPrepared={() => {}}
      />,
    ),
  );
  const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [new File(["actual content"], "notes.txt", { type: "text/plain" })],
  });
  await act(async () =>
    input.dispatchEvent(new Event("change", { bubbles: true })),
  );
  expect(host.querySelector("progress")?.hasAttribute("value")).toBe(false);
  expect(host.textContent).toContain("Uploading…");
  await act(async () =>
    xhr.upload.onprogress({ lengthComputable: true, loaded: 5, total: 10 }),
  );
  expect(host.textContent).toContain("50% · uploading");
  await act(async () =>
    xhr.upload.onprogress({ lengthComputable: true, loaded: 10, total: 10 }),
  );
  expect(host.textContent).toContain("Upload sent · validating file");
  expect(host.textContent).not.toContain("99%");
  vi.unstubAllGlobals();
});
