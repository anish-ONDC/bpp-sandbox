const jsonata = require("jsonata");
const fs = require("fs");
const path = require("path");

const ART = (name) =>
  fs.readFileSync(
    path.join(__dirname, "..", "artifacts", "v2.0.0-to-v3.0.0", name),
    "utf-8"
  );

async function run(label, artifactFile, input, expectedChecks) {
  const expr = jsonata(ART(artifactFile));
  const result = await expr.evaluate(input);
  console.log(`\n=== ${label} ===`);
  console.log("OUTPUT:", JSON.stringify(result, null, 2));
  let allPassed = true;
  for (const [desc, checkFn] of expectedChecks) {
    const passed = checkFn(result);
    console.log(`  [${passed ? "PASS" : "FAIL"}] ${desc}`);
    if (!passed) allPassed = false;
  }
  return allPassed;
}

(async () => {
  let allOk = true;

  // discover request, v2.0.0 -> v3.0.0: identity
  allOk = (await run(
    "discover v2.0.0 -> v3.0.0",
    "discover_from_v2.0.0_to_v3.0.0.jsonata",
    { context: { action: "discover", version: "2.0.0", transactionId: "t1" }, message: { intent: {} } },
    [
      ["output unchanged from input", (r) => r.context.version === "2.0.0" && JSON.stringify(r.message) === JSON.stringify({ intent: {} })],
    ]
  )) && allOk;

  // on_discover response, v3.0.0 -> v2.0.0: strip traceId + catalogSummary
  allOk = (await run(
    "on_discover v3.0.0 -> v2.0.0",
    "on_discover_from_v3.0.0_to_v2.0.0.jsonata",
    {
      context: { action: "on_discover", version: "3.0.0", transactionId: "t1", traceId: "trace-abc-123" },
      message: { catalogs: [{ id: "cat-1", descriptor: { name: "Test Catalog" } }], catalogSummary: ["Snowboards", "Accessories"] },
    },
    [
      ["traceId stripped from context", (r) => !("traceId" in r.context)],
      ["transactionId preserved", (r) => r.context.transactionId === "t1"],
      ["catalogSummary stripped from message", (r) => !("catalogSummary" in r.message)],
      ["catalogs array preserved untouched", (r) => r.message.catalogs[0].id === "cat-1"],
    ]
  )) && allOk;

  // status request, v2.0.0 -> v3.0.0: identity
  allOk = (await run(
    "status v2.0.0 -> v3.0.0",
    "status_from_v2.0.0_to_v3.0.0.jsonata",
    { context: { action: "status", version: "2.0.0", transactionId: "t1" }, message: { contract: { id: "contract-t1" } } },
    [
      ["output unchanged from input", (r) => r.message.contract.id === "contract-t1" && !("performance" in r.message.contract)],
    ]
  )) && allOk;

  // on_status response, v3.0.0 -> v2.0.0: strip traceId, rename progress -> performance
  allOk = (await run(
    "on_status v3.0.0 -> v2.0.0 (with progress present)",
    "on_status_from_v3.0.0_to_v2.0.0.jsonata",
    {
      context: { action: "on_status", version: "3.0.0", transactionId: "t1", traceId: "trace-xyz" },
      message: { contract: { id: "contract-t1", status: { code: "ACTIVE" }, progress: [{ id: "perf-1", status: { code: "IN_TRANSIT" } }] } },
    },
    [
      ["traceId stripped from context", (r) => !("traceId" in r.context)],
      ["progress renamed to performance", (r) => !("progress" in r.message.contract) && r.message.contract.performance[0].id === "perf-1"],
      ["status field untouched", (r) => r.message.contract.status.code === "ACTIVE"],
    ]
  )) && allOk;

  // on_status response with NO progress entries yet (edge case)
  allOk = (await run(
    "on_status v3.0.0 -> v2.0.0 (no progress yet)",
    "on_status_from_v3.0.0_to_v2.0.0.jsonata",
    {
      context: { action: "on_status", version: "3.0.0", transactionId: "t1", traceId: "trace-xyz" },
      message: { contract: { id: "contract-t1", status: { code: "DRAFT" } } },
    },
    [
      ["no performance key fabricated when progress was absent", (r) => !("performance" in r.message.contract)],
      ["status field still untouched", (r) => r.message.contract.status.code === "DRAFT"],
    ]
  )) && allOk;

  console.log(`\n${allOk ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"}`);
  process.exit(allOk ? 0 : 1);
})();
