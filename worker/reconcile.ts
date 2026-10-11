import { database } from "../src/server/db";
import { reconcileOperation } from "../src/server/reconcile";
let stopping = false;
let databaseReady = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});
while (!stopping) {
  try {
    const rows =
      await database()`SELECT id FROM operations WHERE status IN ('waiting-wallet','submitting','confirming','unknown') ORDER BY updated_at LIMIT 50`;
    if (!databaseReady) {
      console.log(JSON.stringify({ event: "worker_database_ready" }));
      databaseReady = true;
    }
    for (const op of rows) {
      try {
        await reconcileOperation(op.id);
      } catch {
        console.error(
          JSON.stringify({
            event: "reconciliation_failed",
            operationId: op.id,
          }),
        );
      }
    }
  } catch (error) {
    databaseReady = false;
    const safe = error as {
      name?: string;
      code?: string;
      cause?: { code?: string };
    };
    console.error(
      JSON.stringify({
        event: "worker_database_unavailable",
        name: safe?.name,
        code: safe?.code,
        causeCode: safe?.cause?.code,
      }),
    );
  }
  await new Promise((resolve) => setTimeout(resolve, 15000));
}
