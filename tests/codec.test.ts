import { it, expect } from "vitest";
import {
  discriminator,
  instructionNames,
  escrowInstruction,
  decodeBounty,
} from "../src/chain/escrow";
import idl from "../src/chain/generated/escrow.json";
import type { Bounty } from "../src/domain/bounty";
const b: Bounty = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Translate",
  description: "Test community announcement",
  category: "Translation",
  requirements: ["Keep links"],
  reward: "0.123456789",
  requester: "11111111111111111111111111111111",
  worker: null,
  status: "draft",
  requirementsHash: "11".repeat(32),
  deadline: null,
  revisionUsed: false,
  createdAt: "",
  chainAddress: null,
  signature: null,
};
it("matches every instruction discriminator to generated Anchor IDL", async () => {
  for (const name of Object.values(instructionNames)) {
    const ix = idl.instructions.find((i) => i.name === name)!;
    expect(Array.from(await discriminator("global", name))).toEqual(
      ix.discriminator,
    );
  }
});
it("encodes the fund instruction exactly and accounts match the generated IDL", async () => {
  const ix = await escrowInstruction(b, "fund", b.requester);
  expect(ix.data!.length).toBe(64);
  expect(
    new DataView(ix.data!.buffer, ix.data!.byteOffset).getBigUint64(56, true),
  ).toBe(123456789n);
  expect(ix.accounts!.length).toBe(
    idl.instructions.find((i) => i.name === "fund")!.accounts.length,
  );
});
it("rejects unrecognized chain accounts", async () => {
  await expect(decodeBounty(new Uint8Array(203))).rejects.toThrow(
    "discriminator",
  );
  await expect(decodeBounty(new Uint8Array(100))).rejects.toThrow("size");
});
