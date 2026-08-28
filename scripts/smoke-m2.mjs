import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const secret = env.match(/SESSION_SECRET="(.+)"/)[1];

function makeToken(uid, name, ttl = 3600) {
  const payload = { uid, name, exp: Math.floor(Date.now() / 1000) + ttl };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

const base = "http://localhost:3000";
const cookie = `aibch_session=${makeToken(1, "admin")}`;
const results = [];

async function check(label, path, withCookie, expectStatus, expectText) {
  const res = await fetch(base + path, {
    redirect: "manual",
    headers: withCookie ? { Cookie: cookie } : {},
  });
  const text = await res.text();
  const statusOk = res.status === expectStatus;
  const textOk = expectText ? text.includes(expectText) : true;
  results.push(
    `${statusOk && textOk ? "PASS" : "FAIL"} ${label}: status=${res.status} (${expectStatus})${expectText ? `, text[${expectText}]=${textOk}` : ""}${res.headers.get("location") ? `, loc=${res.headers.get("location")}` : ""}`
  );
}

await check("classes (with session)", "/classes", true, 200, "advisorName");
await check("settings (with session)", "/settings", true, 200, "docCounter");
await check("settings has director", "/settings", true, 200, "ฮาฟีซี อับดุลเลาะ");
await check("settings has behaviors", "/settings", true, 200, "ทะเลาะวิวาท");
await check("classes (no session)", "/classes", false, 307, null);
await check("dashboard (no session)", "/", false, 307, null);

console.log(results.join("\n"));
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
