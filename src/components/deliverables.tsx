"use client";
import { DiagonalArrow } from "@/components/diagonal-arrow";
import { useEffect, useRef, useState } from "react";
import { api } from "./header";
import { Banner, Button } from "./ui";
import {
  FILE_ACCEPT,
  MAX_ATTACHMENTS,
  MAX_FILE_BYTES,
  type Attachment,
  type Manifest,
  type FrozenSubmission,
  type ConfirmedSubmission,
} from "@/domain/deliverables";

export function AttachmentView({ file }: { file: Attachment }) {
  const [access, setAccess] = useState<{
    previewUrl: string;
    downloadUrl: string;
  } | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState("");
  const alive = useRef(true);
  const requests = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      requests.current++;
    };
  }, []);
  async function open() {
    const request = ++requests.current;
    setError("");
    try {
      const r = await api<NonNullable<typeof access>>(
        `/api/attachments/${file.id}/access`,
        { method: "POST" },
      );
      if (!alive.current || request !== requests.current) return;
      setAccess(r);
      if (file.contentType === "text/plain") {
        const response = await fetch(r.previewUrl, { cache: "no-store" });
        if (!response.ok)
          throw new Error("Preview expired or unavailable. Open again.");
        const value = await response.text();
        if (alive.current && request === requests.current)
          setText(value.slice(0, 20000));
      }
    } catch (e) {
      if (alive.current && request === requests.current)
        setError(e instanceof Error ? e.message : "File unavailable");
    }
  }
  return (
    <div className="deliverable-file">
      <p>
        <strong>{file.filename}</strong> · {(file.size / 1024).toFixed(1)} KiB
      </p>
      <details>
        <summary>File integrity record</summary>
        <p className="helper address">SHA-256: {file.sha256}</p>
      </details>
      <Button type="button" variant="secondary" onClick={open}>
        {access ? "Refresh file access" : "Open file access"}
      </Button>
      {error && <Banner error>{error}</Banner>}
      {access && (
        <>
          <p>
            <a href={access.downloadUrl} target="_blank" rel="noreferrer">
              Download {file.filename} <DiagonalArrow />
            </a>
          </p>
          {file.contentType.startsWith("image/") && (
            <img
              src={access.previewUrl}
              alt={file.filename}
              style={{ maxWidth: "100%", maxHeight: 360 }}
              onError={() =>
                setError("Preview expired or unavailable. Refresh file access.")
              }
            />
          )}
          {text !== null && (
            <>
              <pre className="deliverable-code">{text}</pre>
              <p className="helper">
                Plain-text preview, first 20,000 characters. Download for the
                complete file.
              </p>
            </>
          )}
          {file.contentType === "application/pdf" && (
            <p className="helper">
              PDF delivered as a download for safe viewing in your PDF reader.
            </p>
          )}
          <p className="helper">
            Private access expires after five minutes. Refresh access if needed.
          </p>
        </>
      )}
    </div>
  );
}
export function ManifestView({ manifest }: { manifest: Manifest }) {
  return (
    <div>
      {manifest.writtenResponse && (
        <div>
          <h4>Written response</h4>
          <p className="submission-text">{manifest.writtenResponse}</p>
        </div>
      )}
      {manifest.links.length > 0 && (
        <>
          <h4>Deliverable links</h4>
          <ul className="manifest-links">
            {manifest.links.map((l, i) => (
              <li key={i}>
                <a href={l.url} target="_blank" rel="noreferrer">
                  {l.label} <DiagonalArrow />
                </a>
                <p className="helper address">{l.url}</p>
              </li>
            ))}
          </ul>
          <p className="helper">
            The receipt commits these URLs, not their future contents. Prefer
            commit-specific links and uploaded snapshots.
          </p>
        </>
      )}
      {manifest.attachments.length > 0 && (
        <>
          <h4>Attachments</h4>
          {manifest.attachments.map((f) => (
            <AttachmentView key={f.id} file={f} />
          ))}
        </>
      )}
    </div>
  );
}
type Upload = {
  id: string;
  file: File;
  progress?: number;
  error?: string;
  attachment?: Attachment;
  uploading: boolean;
};
export function DeliverableEditor({
  id,
  owner,
  text,
  setText,
  disabled,
  onPrepared,
}: {
  id: string;
  owner: string;
  text: string;
  setText: (value: string) => void;
  disabled: boolean;
  onPrepared: (value: FrozenSubmission) => void;
}) {
  const storageKey = `bountini.deliverables.v1:${id}:${owner}`;
  const [links, setLinks] = useState<{ label: string; url: string }[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [restored, setRestored] = useState<Attachment[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(true),
    sequence = useRef(0);
  const requests = useRef(new Set<XMLHttpRequest>());
  useEffect(() => {
    mounted.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved) {
        setLinks(saved.links || []);
        setRestored(saved.attachments || []);
      }
    } catch {}
    return () => {
      mounted.current = false;
      sequence.current++;
      requests.current.forEach((r) => r.abort());
    };
  }, [storageKey]);
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          links,
          attachments: [
            ...restored,
            ...uploads.flatMap((u) => (u.attachment ? [u.attachment] : [])),
          ],
        }),
      );
    } catch {}
  }, [links, uploads, restored, storageKey]);
  const files = [
    ...restored,
    ...uploads.flatMap((u) => (u.attachment ? [u.attachment] : [])),
  ];
  const blocked = disabled || pending || uploads.some((u) => u.uploading);
  function upload(entry: Upload) {
    setUploads((old) =>
      old.map((u) =>
        u.id === entry.id
          ? { ...u, uploading: true, error: undefined, progress: undefined }
          : u,
      ),
    );
    const xhr = new XMLHttpRequest();
    requests.current.add(xhr);
    xhr.open("POST", `/api/bounties/${id}/attachments`);
    xhr.timeout = 65000;
    const update = (patch: Partial<Upload>) => {
      if (mounted.current)
        setUploads((old) =>
          old.map((u) => (u.id === entry.id ? { ...u, ...patch } : u)),
        );
    };
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        update({
          progress: Math.floor((e.loaded / e.total) * 100),
        });
    };
    const fail = () =>
      update({
        uploading: false,
        error:
          "Upload interrupted. Retry the same file; completed uploads are preserved.",
      });
    xhr.onerror = fail;
    xhr.ontimeout = fail;
    xhr.onloadend = () => requests.current.delete(xhr);
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status < 200 || xhr.status >= 300)
          throw new Error(body.error || "Upload failed");
        update({
          uploading: false,
          attachment: body.attachment,
          progress: 100,
        });
      } catch (e) {
        update({
          uploading: false,
          error: e instanceof Error ? e.message : "Upload failed; retry",
        });
      }
    };
    const data = new FormData();
    data.set("uploadId", entry.id);
    data.set("file", entry.file);
    xhr.send(data);
  }
  function select(list: FileList | null) {
    if (!list) return;
    if (restored.length + uploads.length + list.length > MAX_ATTACHMENTS) {
      setError("Choose at most six attachments per submission.");
      return;
    }
    const entries: Upload[] = Array.from(list).map((file) => ({
      id: crypto.randomUUID(),
      file,
      progress: undefined,
      uploading: false,
    }));
    if (entries.some((u) => !u.file.size || u.file.size > MAX_FILE_BYTES)) {
      setError("Each file must be nonempty and at most 2 MiB.");
      return;
    }
    setError("");
    setUploads((old) => [...old, ...entries]);
    entries.forEach(upload);
  }
  async function prepare() {
    const token = ++sequence.current;
    setPending(true);
    setError("");
    try {
      const value = await api<FrozenSubmission>(
        `/api/bounties/${id}/submissions/prepare`,
        {
          method: "POST",
          body: JSON.stringify({
            writtenResponse: text,
            links: links.filter((l) => l.label.trim() || l.url.trim()),
            attachmentIds: files.map((f) => f.id),
          }),
        },
      );
      if (mounted.current && token === sequence.current) onPrepared(value);
    } catch (e) {
      if (mounted.current && token === sequence.current)
        setError(
          e instanceof Error
            ? e.message
            : "Preparation failed. Your deliverables are preserved; retry.",
        );
    } finally {
      if (mounted.current && token === sequence.current) setPending(false);
    }
  }
  return (
    <>
      <div className="field">
        <label htmlFor="submission">Written response</label>
        <textarea
          id="submission"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={20000}
          disabled={blocked}
        />
        <span className="helper">
          Explain your work, add links, upload files, or combine them. Draft
          text and completed file references are saved on this device.
        </span>
      </div>
      <h3>Deliverable links</h3>
      {links.map((link, i) => (
        <div className="field" key={i}>
          <label htmlFor={`link-label-${i}`}>Link {i + 1} label</label>
          <input
            id={`link-label-${i}`}
            maxLength={120}
            value={link.label}
            disabled={blocked}
            onChange={(e) =>
              setLinks((old) =>
                old.map((l, n) =>
                  n === i ? { ...l, label: e.target.value } : l,
                ),
              )
            }
          />
          <label htmlFor={`link-url-${i}`}>HTTPS URL</label>
          <input
            id={`link-url-${i}`}
            type="url"
            maxLength={2000}
            value={link.url}
            disabled={blocked}
            onChange={(e) =>
              setLinks((old) =>
                old.map((l, n) =>
                  n === i ? { ...l, url: e.target.value } : l,
                ),
              )
            }
          />
          <Button
            type="button"
            variant="quiet"
            disabled={blocked}
            onClick={() => setLinks((old) => old.filter((_, n) => n !== i))}
          >
            Remove link {i + 1}
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        disabled={blocked || links.length >= 8}
        onClick={() => setLinks((old) => [...old, { label: "", url: "" }])}
      >
        Add deliverable link
      </Button>
      <div className="field">
        <label htmlFor="deliverable-files">Attachments</label>
        <input
          id="deliverable-files"
          type="file"
          multiple
          accept={FILE_ACCEPT}
          disabled={
            blocked || restored.length + uploads.length >= MAX_ATTACHMENTS
          }
          onChange={(e) => {
            select(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="helper">
          Up to six files, 2 MiB each. PNG, JPEG, WebP, PDF (up to 20 pages), or
          UTF-8 text/code. Code is never executed; PDFs download for safe
          viewing.
        </p>
      </div>
      {uploads.map((u) => (
        <div
          key={u.id}
          className="aw-upload"
          role="group"
          aria-label={u.file.name}
        >
          <p>
            {u.file.name} ·{" "}
            {u.uploading
              ? u.progress === undefined
                ? "Uploading…"
                : u.progress >= 100
                  ? "Upload sent · validating file…"
                  : `${u.progress}% · uploading`
              : u.attachment
                ? "Uploaded"
                : "Not uploaded"}
          </p>
          {u.uploading && (
            <progress
              max={100}
              value={u.progress}
              aria-label={`Uploading ${u.file.name}`}
            />
          )}
          {u.error && (
            <>
              <Banner error>{u.error}</Banner>
              <Button
                type="button"
                variant="secondary"
                disabled={disabled || pending}
                onClick={() => upload(u)}
              >
                Retry upload
              </Button>
            </>
          )}
          {u.attachment && <AttachmentView file={u.attachment} />}
          <Button
            type="button"
            variant="quiet"
            disabled={blocked}
            onClick={() =>
              setUploads((old) => old.filter((x) => x.id !== u.id))
            }
          >
            Remove {u.file.name}
          </Button>
        </div>
      ))}
      {restored.map((f) => (
        <div key={f.id}>
          <AttachmentView file={f} />
          <Button
            type="button"
            variant="quiet"
            disabled={blocked}
            onClick={() =>
              setRestored((old) => old.filter((x) => x.id !== f.id))
            }
          >
            Remove {f.filename}
          </Button>
        </div>
      ))}
      {error && <Banner error>{error}</Banner>}
      <Button
        type="button"
        pending={pending}
        disabled={
          blocked ||
          uploads.some((u) => !u.attachment) ||
          (!text.trim() && !links.length && !files.length)
        }
        onClick={prepare}
      >
        Review submission summary
      </Button>
    </>
  );
}
export function ConfirmedDeliverables({
  id,
  onLoaded,
  selectVersions = false,
}: {
  id: string;
  onLoaded?: (versions: ConfirmedSubmission[] | null) => void;
  selectVersions?: boolean;
}) {
  const [versions, setVersions] = useState<ConfirmedSubmission[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    setError("");
    setVersions(null);
    onLoaded?.(null);
    api<{ submissions: ConfirmedSubmission[] }>(
      `/api/bounties/${id}/submissions`,
      { cache: "no-store" },
    )
      .then((r) => {
        if (!cancelled) {
          setVersions(r.submissions);
          onLoaded?.(r.submissions);
          setSelected(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id, attempt, onLoaded]);
  return error ? (
    <Banner error>
      {error}{" "}
      <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
        Retry confirmed delivery
      </Button>
    </Banner>
  ) : !versions ? (
    <p>Loading confirmed submission…</p>
  ) : (
    <>
      {!versions.length && <p>No confirmed deliveries yet.</p>}
      {selectVersions && versions.length > 1 && (
        <div
          className="rv-versions"
          role="group"
          aria-label="Submission version"
        >
          {versions.map((s, i) => (
            <Button
              key={i}
              variant="secondary"
              aria-pressed={(selected ?? versions.length - 1) === i}
              onClick={() => setSelected(i)}
            >
              {s.revision ? "Revised submission" : "Original submission"}
            </Button>
          ))}
        </div>
      )}
      {versions.map((s, i) => (
        <section
          key={s.content_hash || i}
          className="confirmed-version"
          hidden={selectVersions && (selected ?? versions.length - 1) !== i}
        >
          <h3>{s.revision ? "Revised submission" : "Original submission"}</h3>
          {s.manifest ? (
            <ManifestView manifest={s.manifest} />
          ) : (
            <p className="submission-text">{s.body}</p>
          )}
          {s.content_hash && (
            <details>
              <summary>Submission integrity record</summary>
              <p className="helper address">
                {s.manifest ? "Manifest" : "Text"} SHA-256: {s.content_hash}
              </p>
            </details>
          )}
        </section>
      ))}
    </>
  );
}
