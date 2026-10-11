import { z } from "zod";

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_ATTACHMENTS = 6;
export const TEXT_EXTENSIONS = [
  "txt",
  "md",
  "csv",
  "json",
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "rs",
  "go",
  "java",
  "c",
  "cpp",
  "h",
  "css",
  "html",
  "xml",
  "yaml",
  "yml",
  "sql",
  "sh",
];
export const FILE_ACCEPT =
  ".png,.jpg,.jpeg,.webp,.pdf," + TEXT_EXTENSIONS.map((x) => "." + x).join(",");
export const linkSchema = z.object({
  label: z.string().trim().min(1).max(120),
  url: z
    .string()
    .trim()
    .max(2000)
    .url()
    .refine((value) => {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password;
    }, "Use an HTTPS link without credentials"),
});
export const submissionInput = z
  .object({
    writtenResponse: z.string().trim().max(20000).default(""),
    links: z.array(linkSchema).max(8).default([]),
    attachmentIds: z.array(z.uuid()).max(MAX_ATTACHMENTS).default([]),
  })
  .refine(
    (x) =>
      x.writtenResponse.length >= 10 ||
      x.links.length > 0 ||
      x.attachmentIds.length > 0,
    "Add at least 10 characters of work, a deliverable link, or an attachment",
  )
  .refine(
    (x) => new Set(x.attachmentIds).size === x.attachmentIds.length,
    "Duplicate attachments are not allowed",
  );
export type Attachment = {
  id: string;
  filename: string;
  size: number;
  contentType: string;
  sha256: string;
};
export type Manifest = {
  format: "bountini-deliverables-v1";
  bountyId: string;
  version: number;
  writtenResponse: string;
  links: z.infer<typeof linkSchema>[];
  attachments: Attachment[];
};
export type FrozenSubmission = {
  id: string;
  contentHash: string;
  manifest: Manifest;
};
export type ConfirmedSubmission = {
  body: string;
  revision: number;
  content_hash?: string;
  created_at?: string;
  manifest?: Manifest | null;
};
