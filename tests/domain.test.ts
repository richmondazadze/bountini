import { describe, it, expect } from "vitest";
import {
  parseSOL,
  formatSOL,
  canonicalAgreement,
  canAct,
} from "../src/domain/bounty";
describe("exact money", () => {
  it("preserves a single lamport and full precision", () => {
    expect(parseSOL("0.000000001")).toBe(1n);
    expect(formatSOL(parseSOL("12.123456789"))).toBe("12.123456789");
    expect(formatSOL(1_000_000_000n)).toBe("1");
  });
  it.each(["-1", "1e3", "NaN", "1,2", "0.0000000001", "18446744074"])(
    "rejects invalid amount %s",
    (v) => expect(() => parseSOL(v)).toThrow(),
  );
});
describe("authorization and exact deadline", () => {
  const b = {
    status: "in-review" as const,
    requester: "requester",
    worker: "worker",
    deadline: 1000,
    revisionUsed: false,
  };
  it("requires requester approval strictly before expiry", () => {
    expect(canAct(b, "approve", "worker", 999)).toBe(false);
    expect(canAct(b, "approve", "requester", 999)).toBe(true);
    expect(canAct(b, "approve", "requester", 1000)).toBe(false);
    expect(canAct(b, "expire", "requester", 1000)).toBe(true);
  });
  it("prevents second revision and self claim", () => {
    expect(
      canAct({ ...b, revisionUsed: true }, "revise", "requester", 999),
    ).toBe(false);
    expect(
      canAct({ ...b, status: "open", worker: null }, "claim", "requester", 0),
    ).toBe(false);
  });
  it("prevents terminal settlement and unauthorized submission", () => {
    expect(canAct({ ...b, status: "paid" }, "approve", "requester", 999)).toBe(
      false,
    );
    expect(
      canAct({ ...b, status: "in-progress" }, "submit", "intruder", 999),
    ).toBe(false);
  });
});
it("canonicalizes line endings and exact rewards", () => {
  const d = {
    title: "Translate announcement",
    description: "A community announcement\r\nfor our Spanish audience",
    category: "Translation" as const,
    requirements: ["Preserve all links"],
    reward: "0.10",
  };
  expect(canonicalAgreement(d)).toBe(
    canonicalAgreement({
      ...d,
      description: d.description.replace("\r\n", "\n"),
      reward: "0.1",
    }),
  );
});
