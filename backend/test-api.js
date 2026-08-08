// =============================================================================
// AgriSync — Automated API Test Script (Windows/PowerShell Compatible)
// =============================================================================
// Run this AFTER: npm run dev  (server must be running on port 5000)
// Usage: node test-api.js
//
// Tests every endpoint against your Supabase + Prisma backend.
// Works with your full schema (User profiles, Products, Orders, etc.)
// =============================================================================

const BASE_URL = "http://localhost:5000";

// Terminal colors
const R = "\x1b[0m";
const G = "\x1b[32m";
const RED = "\x1b[31m";
const Y = "\x1b[33m";
const B = "\x1b[34m";
const C = "\x1b[36m";

let passed = 0;
let failed = 0;

const state = {
  farmerToken: null,
  buyerToken: null,
  adminToken: null,
  productId: null,
  farmerId: null,
};

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------
async function req(path, opts = {}) {
  const url = `${BASE_URL}${path}`;
  const options = {
    ...opts,  // spread everything first
    headers: {
      "Content-Type": "application/json",  // then merge headers (this WON'T be overwritten)
      ...opts.headers,
    },
  };
  if (options.body && typeof options.body === "object") {
    options.body = JSON.stringify(options.body);
  }
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return { status: 0, ok: false, data: err.message };
  }
}

function ok(name, condition, detail = "") {
  if (condition) {
    console.log(`${G}  PASS${R} ${name}${detail ? C + "  → " + detail + R : ""}`);
    passed++;
  } else {
    console.log(`${RED}  FAIL${R} ${name}${detail ? RED + "  → " + detail + R : ""}`);
    failed++;
  }
}

function hdr(title) {
  console.log(`\n${Y}▶ ${title}${R}`);
}

// ---------------------------------------------------------------------------
// Run all tests
// ---------------------------------------------------------------------------
async function run() {
  console.log(`${B}\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║      AgriSync API Automated Test Suite                       ║`);
  console.log(`║      (Supabase + Prisma ORM — Full Schema)                   ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝${R}\n`);

  // ── 1. HEALTH ──────────────────────────────────────────────────────
  hdr("1. Server Health");
  const h = await req("/");
  ok("Server responds", h.ok && typeof h.data === "string", h.data);

  // ── 2. FARMER LOGIN ────────────────────────────────────────────────
  hdr("2. Farmer Authentication");
  const fl = await req("/api/users/login", {
    method: "POST",
    body: { email: "farmer1@agrisync.com", password: "farmer123" },
  });
  ok("Farmer login 200", fl.ok, `Status ${fl.status}`);
  ok("Farmer token exists", fl.data?.token?.length > 10, `Token ${fl.data?.token?.slice(0, 20)}...`);
  ok("Farmer role correct", fl.data?.role === "farmer", `Role: ${fl.data?.role}`);
  ok("Farmer has _id", fl.data?._id || fl.data?.id, `ID: ${fl.data?._id || fl.data?.id}`);
  if (fl.data?.token) { state.farmerToken = fl.data.token; state.farmerId = fl.data._id || fl.data.id; }

  // ── 3. FARMER PROFILE ──────────────────────────────────────────────
  hdr("3. Farmer Profile (Protected)");
  if (state.farmerToken) {
    const fp = await req("/api/users/profile", { headers: { Authorization: `Bearer ${state.farmerToken}` } });
    ok("Profile 200", fp.ok, `Status ${fp.status}`);
    ok("Profile has name", fp.data?.name, fp.data?.name);
    ok("Profile email matches", fp.data?.email === "farmer1@agrisync.com", fp.data?.email);
    ok("Profile has role", fp.data?.role === "farmer", fp.data?.role);
  } else {
    ok("Profile skipped (no token)", false, "Login failed");
  }

  // ── 4. PRODUCTS (Public) ───────────────────────────────────────────
  hdr("4. Products — Public Routes");
  const pl = await req("/api/products");
  ok("GET /products 200", pl.ok, `Status ${pl.status}`);
  ok("Products is array", Array.isArray(pl.data) && pl.data.length > 0, `Count: ${pl.data?.length}`);

  if (Array.isArray(pl.data) && pl.data.length > 0) {
    state.productId = pl.data[0].id || pl.data[0]._id;
    if (!state.farmerId && pl.data[0].farmerId) state.farmerId = pl.data[0].farmerId;

    const p1 = await req(`/api/products/${state.productId}`);
    ok("GET single product 200", p1.ok, `Status ${p1.status}`);
    ok("Product has name", p1.data?.name, p1.data?.name);
    ok("Product has price", p1.data?.price != null, `Price: ${p1.data?.price}`);
    ok("Product has farmer", p1.data?.farmer != null, `Farmer: ${p1.data?.farmer?.name}`);
    ok("Product has legacyCategory/category", p1.data?.legacyCategory || p1.data?.category, p1.data?.legacyCategory || p1.data?.category);
  } else {
    ok("Single product skipped", false, "No products returned");
  }

  // ── 5. SEARCH / FILTER ─────────────────────────────────────────────
  hdr("5. Search & Filter");
  const s1 = await req("/api/products?search=rice");
  ok("Search 'rice' 200", s1.ok && Array.isArray(s1.data), `Count: ${s1.data?.length}`);

  const s2 = await req("/api/products?categoryId?=Fresh%20Vegetables");
  ok("Filter category 200", s2.ok && Array.isArray(s2.data), `Count: ${s2.data?.length}`);

  const s3 = await req("/api/products?minPrice=50&maxPrice=200");
  ok("Price range 200", s3.ok && Array.isArray(s3.data), `Count: ${s3.data?.length}`);

  const s4 = await req("/api/products?search=xyznonexistent");
  ok("Search no results 200", s4.ok && Array.isArray(s4.data) && s4.data.length === 0, `Count: ${s4.data?.length}`);

  // ── 6. BUYER LOGIN ─────────────────────────────────────────────────
  hdr("6. Buyer Authentication");
  const bl = await req("/api/users/login", {
    method: "POST",
    body: { email: "buyer1@agrisync.com", password: "buyer123" },
  });
  ok("Buyer login 200", bl.ok, `Status ${bl.status}`);
  ok("Buyer token exists", bl.data?.token?.length > 10, `Token ${bl.data?.token?.slice(0, 20)}...`);
  ok("Buyer role correct", bl.data?.role === "buyer", `Role: ${bl.data?.role}`);
  if (bl.data?.token) state.buyerToken = bl.data.token;

  // ── 7. BUYER WISHLIST ──────────────────────────────────────────────
  hdr("7. Buyer Wishlist");
  if (state.buyerToken) {
    const wl = await req("/api/users/wishlist", { headers: { Authorization: `Bearer ${state.buyerToken}` } });
    ok("GET wishlist 200", wl.ok, `Status ${wl.status}`);
    ok("Wishlist is array", Array.isArray(wl.data), `Items: ${wl.data?.length}`);

    if (state.productId) {
      const wa = await req(`/api/users/wishlist/${state.productId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${state.buyerToken}` },
      });
      ok("Toggle wishlist ADD 200", wa.ok, `Status ${wa.status}`);

      const wr = await req(`/api/users/wishlist/${state.productId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${state.buyerToken}` },
      });
      ok("Toggle wishlist REMOVE 200", wr.ok, `Status ${wr.status}`);
    }
  } else {
    ok("Wishlist tests skipped", false, "No buyer token");
  }

  // ── 8. FOLLOW FARMERS ──────────────────────────────────────────────
  hdr("8. Follow Farmers");
  if (state.buyerToken && state.farmerId) {
    const fg = await req("/api/users/following", { headers: { Authorization: `Bearer ${state.buyerToken}` } });
    ok("GET following 200", fg.ok, `Status ${fg.status}`);
    ok("Following is array", Array.isArray(fg.data), `Count: ${fg.data?.length}`);

    const ft = await req(`/api/users/follow/${state.farmerId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${state.buyerToken}` },
    });
    ok("Toggle follow 200", ft.ok, `Status ${ft.status}`);
  } else {
    ok("Follow tests skipped", false, `Token:${!!state.buyerToken} FarmerID:${!!state.farmerId}`);
  }

  // ── 9. ADMIN LOGIN ─────────────────────────────────────────────────
  hdr("9. Admin Authentication");
  const al = await req("/api/users/login", {
    method: "POST",
    body: { email: "admin@agrisync.com", password: "admin123" },
  });
  ok("Admin login 200", al.ok, `Status ${al.status}`);
  ok("Admin token exists", al.data?.token?.length > 10, `Token ${al.data?.token?.slice(0, 20)}...`);
  ok("Admin role correct", al.data?.role === "admin", `Role: ${al.data?.role}`);
  if (al.data?.token) state.adminToken = al.data.token;

  // ── 10. UNAUTHORIZED / BAD TOKEN ──────────────────────────────────
  hdr("10. Security — Unauthorized Access");
  const na = await req("/api/users/profile");
  ok("No token → 401", na.status === 401, `Status ${na.status}`);

  const bt = await req("/api/users/profile", { headers: { Authorization: "Bearer faketoken123" } });
  ok("Bad token → 401", bt.status === 401, `Status ${bt.status}`);

  // ── 11. ROLE-BASED ACCESS CONTROL ──────────────────────────────────
  hdr("11. Role-Based Access Control");
  if (state.buyerToken) {
    const bp = await req("/api/products", {
      method: "POST",
      headers: { Authorization: `Bearer ${state.buyerToken}` },
      body: { name: "Hacked Product", category: "Test", price: 1 },
    });
    ok("Buyer POST product → 403", bp.status === 403, `Status ${bp.status}`);
  }
  if (state.farmerToken) {
    const fw = await req("/api/users/wishlist", { headers: { Authorization: `Bearer ${state.farmerToken}` } });
    ok("Farmer GET wishlist → 403", fw.status === 403, `Status ${fw.status}`);
  }

  // ── 12. DELIVERY MAN LOGIN ─────────────────────────────────────────
  hdr("12. Delivery Man Authentication");
  const dl = await req("/api/users/login", {
    method: "POST",
    body: { email: "delivery1@agrisync.com", password: "delivery123" },
  });
  ok("Delivery login 200", dl.ok, `Status ${dl.status}`);
  ok("Delivery role correct", dl.data?.role === "delivery_man", `Role: ${dl.data?.role}`);

  // ── 13. UPDATE PROFILE ─────────────────────────────────────────────
  hdr("13. Update Profile");
  if (state.farmerToken) {
    const up = await req("/api/users/profile", {
      method: "PUT",
      headers: { Authorization: `Bearer ${state.farmerToken}` },
      body: { phone: "01799999999", bio: "Updated bio from test script" },
    });
    ok("Update profile 200", up.ok, `Status ${up.status}`);
    ok("Updated phone", up.data?.phone === "01799999999", up.data?.phone);
    ok("Updated bio", up.data?.bio === "Updated bio from test script", up.data?.bio);
  }

  // ── 14. REGISTER NEW USER ──────────────────────────────────────────
  hdr("14. User Registration");
  const regEmail = `testuser_${Date.now()}@agrisync.com`;
  const reg = await req("/api/users/register", {
    method: "POST",
    body: { name: "Test User", email: regEmail, password: "testpass123", role: "buyer" },
  });
  ok("Register buyer 201", reg.status === 201 || reg.ok, `Status ${reg.status}`);
  ok("Register returns token", reg.data?.token?.length > 10, "Token received");

  // Duplicate email
  const dup = await req("/api/users/register", {
    method: "POST",
    body: { name: "Test User", email: regEmail, password: "testpass123", role: "buyer" },
  });
  ok("Duplicate email → 400", dup.status === 400, `Status ${dup.status}`);

  // ── SUMMARY ────────────────────────────────────────────────────────
  console.log(`\n${B}╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  RESULTS                                                     ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  ${G}Passed: ${String(passed).padEnd(51 - 9)}${R}║`);
  console.log(`║  ${RED}Failed: ${String(failed).padEnd(51 - 9)}${R}║`);
  console.log(`║  ${B}Total:  ${String(passed + failed).padEnd(51 - 9)}${R}║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝${R}`);

  if (failed === 0) {
    console.log(`\n${G}All tests passed! Your Supabase + Prisma backend is fully working.${R}\n`);
  } else {
    console.log(`\n${RED}${failed} test(s) failed. Review the errors above.${R}\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(`${RED}Test runner crashed:${R}`, err);
  process.exit(1);
});
