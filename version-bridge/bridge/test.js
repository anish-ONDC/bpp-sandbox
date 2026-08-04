const { bridge, BridgeError } = require("./bridge");

const REGISTRY_URL = "http://localhost:9100";
const BPP_ID = "nfh.global/subscribers.beckn.one/seller-side-bpp"; // v3.0.0
const BAP_ID = "nfh.global/subscribers.beckn.one/example-bap"; // v2.0.0

let allOk = true;
function check(desc, condition) {
  console.log(`  [${condition ? "PASS" : "FAIL"}] ${desc}`);
  if (!condition) allOk = false;
}

(async () => {
  console.log("=== 1. Inbound discover, BAP (v2.0.0) -> target BPP (v3.0.0) ===");
  const discoverIn = {
    context: { action: "discover", version: "2.0.0", transactionId: "t1", bapId: "example-bap" },
    message: { intent: {} },
  };
  const r1 = await bridge({ payload: discoverIn, action: "discover", targetSubscriberId: BPP_ID, registryUrl: REGISTRY_URL });
  console.log("  OUTPUT:", JSON.stringify(r1));
  check("version bumped to target's 3.0.0", r1.context.version === "3.0.0");
  check("transactionId preserved", r1.context.transactionId === "t1");
  check("message content unchanged (identity artifact)", JSON.stringify(r1.message) === JSON.stringify({ intent: {} }));

  console.log("\n=== 2. Outbound on_status, BPP (v3.0.0) -> target BAP (v2.0.0) ===");
  const statusOut = {
    context: { action: "on_status", version: "3.0.0", transactionId: "t1", traceId: "trace-999" },
    message: { contract: { id: "contract-t1", status: { code: "ACTIVE" }, progress: [{ id: "perf-1", status: { code: "IN_TRANSIT" } }] } },
  };
  const r2 = await bridge({ payload: statusOut, action: "on_status", targetSubscriberId: BAP_ID, registryUrl: REGISTRY_URL });
  console.log("  OUTPUT:", JSON.stringify(r2));
  check("version downgraded to target's 2.0.0", r2.context.version === "2.0.0");
  check("traceId stripped", !("traceId" in r2.context));
  check("progress renamed to performance", !("progress" in r2.message.contract) && r2.message.contract.performance[0].id === "perf-1");

  console.log("\n=== 3. Already-matching version (BPP sending to itself, both v3.0.0) ===");
  const alreadyMatching = { context: { action: "on_status", version: "3.0.0", transactionId: "t1" }, message: { contract: { id: "x" } } };
  const r3 = await bridge({ payload: alreadyMatching, action: "on_status", targetSubscriberId: BPP_ID, registryUrl: REGISTRY_URL });
  check("no-op when versions already match, object returned as-is", r3 === alreadyMatching);

  console.log("\n=== 4. No hop exists (fail-closed check) ===");
  let threw = false;
  try {
    await bridge({
      payload: { context: { action: "discover", version: "9.9.9", transactionId: "t1" }, message: {} },
      action: "discover",
      targetSubscriberId: BPP_ID,
      registryUrl: REGISTRY_URL,
    });
  } catch (e) {
    threw = e instanceof BridgeError;
    console.log("  threw as expected:", e.message);
  }
  check("throws BridgeError instead of passing through untranslated", threw);

  console.log(`\n${allOk ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"}`);
  process.exit(allOk ? 0 : 1);
})();
