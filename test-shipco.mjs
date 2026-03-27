/**
 * Ship&Co API Test Script
 * Run: node test-shipco.mjs
 *
 * Tests:
 *  1. API token validity (GET /accounts)
 *  2. List available carriers
 *  3. Create a real test shipment → appears in Ship&Co portal
 */

const API_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhidTI3Z2Zwa1dabWRnN29SIiwiaWF0IjoxNzczNDIzMDIzfQ.iyI5lzY7Pgn89J722dGbuPSOwZsjETH3QtM7d_2qeHw";
const BASE_URL = "https://app.shipandco.com/api/v1";

const HEADERS = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};

async function call(method, path, body) {
  const opts = { method, headers: HEADERS };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, ok: res.ok, body: json };
}

function print(label, data) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${label}`);
  console.log("─".repeat(60));
  console.log(JSON.stringify(data, null, 2));
}

// ── Tomorrow's date in YYYY-MM-DD ────────────────────────────────────────────
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const deliveryDate = tomorrow.toISOString().split("T")[0];

// ── Test payload — real addresses for Japan domestic shipment ─────────────────
const shipmentPayload = {
  shipment: {
    setup: {
      date: deliveryDate,
      type: "delivery",
      no_customer_notification: true,
    },
    from_address: {
      full_name: "BondEx Test Staff",
      company:   "Sakura Hotel Shinjuku (TEST)",
      address1:  "1-1-1 Nishi-Shinjuku",
      city:      "Shinjuku-ku",
      state:     "Tokyo",
      zip:       "160-0023",
      country:   "JP",
      phone:     "0312345678",
    },
    to_address: {
      full_name: "BondEx Test Guest",
      company:   "Narita Airport Hotel (TEST)",
      address1:  "1-1 Furugome",
      address2:  "Ref: Test Guest C/I: " + deliveryDate,
      city:      "Narita-shi",
      state:     "Chiba",
      zip:       "282-0004",
      country:   "JP",
      phone:     "0476000000",
    },
    parcels: [
      { width: 50, height: 30, depth: 70, weight: 15 },
    ],
  },
};

(async () => {
  console.log("\n🚀  BondEx × Ship&Co API Test");
  console.log("═".repeat(60));

  // ── Step 1: Verify token ───────────────────────────────────────────────────
  console.log("\n[1/3] Verifying API token (GET /accounts)...");
  const acct = await call("GET", "/accounts");
  if (!acct.ok) {
    print("❌  Auth FAILED", acct);
    console.log("\nFix: Check SHIPCO_API_KEY in .env.local — regenerate at https://app.shipandco.com/settings/api");
    process.exit(1);
  }
  print("✅  Auth OK — Account info", acct.body);

  // ── Step 2: List carriers ─────────────────────────────────────────────────
  console.log("\n[2/3] Fetching available carriers...");
  const carriers = await call("GET", "/carriers");
  if (!carriers.ok) {
    print("⚠️  Carriers fetch failed (non-fatal)", carriers);
  } else {
    const names = Array.isArray(carriers.body)
      ? carriers.body.map(c => c.name ?? c.code ?? c).join(", ")
      : JSON.stringify(carriers.body);
    console.log(`  Available carriers: ${names}`);
  }

  // ── Step 3: Create test shipment ──────────────────────────────────────────
  console.log(`\n[3/3] Creating TEST shipment (delivery date: ${deliveryDate})...`);
  console.log("  ⚠️  This will appear as a REAL shipment in your Ship&Co portal!");
  const result = await call("POST", "/shipments", shipmentPayload);
  print(result.ok ? "✅  Shipment created!" : "❌  Shipment creation FAILED", result.body);

  if (result.ok) {
    const s = result.body;
    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║  CHECK YOUR SHIP&CO PORTAL: https://app.shipandco.com   ║");
    console.log("╚══════════════════════════════════════════════════════════╝");
    console.log(`  Shipment ID:      ${s.id ?? s.shipment?.id ?? "—"}`);
    console.log(`  Tracking Number:  ${s.tracking_number ?? s.shipment?.tracking_number ?? "—"}`);
    console.log(`  Label URL:        ${s.label_url ?? s.shipment?.label_url ?? "—"}`);
    console.log(`  Carrier:          ${s.carrier ?? "—"}`);
    console.log(`  Status:           ${s.status ?? "—"}`);
    console.log(`  Rate:             ¥${s.rate?.total ?? s.rate ?? s.cost ?? "—"}`);
  } else {
    console.log("\nCommon causes:");
    console.log("  • Address format invalid for Japan");
    console.log("  • Carrier not configured in Ship&Co account");
    console.log("  • Delivery date is a holiday or past cutoff");
  }
})();
