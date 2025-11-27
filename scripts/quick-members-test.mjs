// Quick test script for members API: GET, POST, GET, PATCH, DELETE, GET
// Usage: node scripts/quick-members-test.mjs [boardId]

const boardId = process.argv[2] || "cmg9j6g000g2pn0wms1b1w5l";
const base = `http://localhost:3001/api/boards/${boardId}/members`;

async function run() {
  try {
    console.log("GET before");
    let a = await fetch(base);
    console.log("status", a.status);
    console.log(await a.text());

    const email = `perf.test+member${Date.now()}@example.com`;
    console.log("\nPOST add", email);
    let b = await fetch(base, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, name: "Perf Test", role: "EDITOR" }),
    });
    console.log("status", b.status);
    const bj = await b.text();
    console.log(bj);
    const userId = JSON.parse(bj).id;

    console.log("\nGET after add");
    let c = await fetch(base);
    console.log("status", c.status);
    console.log(await c.text());

    console.log("\nPATCH role -> VIEWER");
    let d = await fetch(`${base}/${userId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "VIEWER" }),
    });
    console.log("status", d.status);
    console.log(await d.text());

    console.log("\nDELETE member");
    let e = await fetch(`${base}/${userId}`, { method: "DELETE" });
    console.log("status", e.status);
    console.log(await e.text());

    console.log("\nGET after delete");
    let f = await fetch(base);
    console.log("status", f.status);
    console.log(await f.text());

    console.log("\nDone.");
  } catch (e) {
    console.error("error", e);
    process.exit(1);
  }
}

run();