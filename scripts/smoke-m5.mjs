import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const secret = env.match(/SESSION_SECRET="(.+)"/)[1];
const db = new PrismaClient();

function makeToken(uid, name, ttl = 3600) {
  const payload = { uid, name, exp: Math.floor(Date.now() / 1000) + ttl };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

const base = "http://localhost:3000";
const cookie = `aibch_session=${makeToken(1, "admin")}`;
const results = [];

async function check(label, path, expectStatus, expectText, headers = {}) {
  const res = await fetch(base + path, {
    redirect: "manual",
    headers: { Cookie: cookie, ...headers },
  });
  const text = await res.text();
  const ok = res.status === expectStatus && (!expectText || text.includes(expectText));
  results.push(
    `${ok ? "PASS" : "FAIL"} ${label}: status=${res.status}(${expectStatus})${expectText ? ` text[${expectText}]=${text.includes(expectText)}` : ""}`
  );
  return text;
}

async function cleanup() {
  const olds = await db.student.findMany({ where: { fullName: "ทดสอบ แดชบอร์ด" } });
  for (const s of olds) {
    await db.incident.deleteMany({ where: { studentId: s.id } });
    await db.student.delete({ where: { id: s.id } });
  }
}

async function main() {
  await cleanup();

  const classroom = await db.classroom.findFirst({ where: { level: "ม.", grade: 2 } });
  const behaviors = await db.behavior.findMany({ take: 2 });
  if (!classroom || behaviors.length < 2) throw new Error("missing seed data");

  const student = await db.student.create({
    data: {
      fullName: "ทดสอบ แดชบอร์ด",
      classroomId: classroom.id,
      studentNo: "77",
      guardianName: "ผู้ปกครองแดชบอร์ด",
    },
  });

  const now = new Date();
  for (let i = 0; i < 3; i++) {
    await db.incident.create({
      data: {
        studentId: student.id,
        classroomId: classroom.id,
        classroomText: `${classroom.level}${classroom.grade}/${classroom.roomNo}`,
        occurredAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - i),
        knownVia: "เห็นเอง",
        status: i === 0 ? "closed" : "recorded",
        behaviors: { create: { behaviorId: behaviors[i % 2].id } },
      },
    });
  }

  const dashText = await check("แดชบอร์ดสถิติจริง", "/", 200, "พฤติกรรมที่พบบ่อย");
  results.push(
    `${dashText.includes("นักเรียนเฝ้าระวัง") && dashText.includes("ทดสอบ แดชบอร์ด") ? "PASS" : "FAIL"} แดชบอร์ดมีนักเรียนเฝ้าระวัง (3 เคส)`
  );

  const month = now.getMonth() + 1;
  const yearTh = now.getFullYear() + 543;
  await check(
    "หน้ารายงาน",
    `/reports?month=${month}&year=${yearTh}`,
    200,
    "ทดสอบ แดชบอร์ด"
  );

  const exportRes = await fetch(
    `${base}/api/reports/export?month=${month}&year=${yearTh}`,
    { headers: { Cookie: cookie } }
  );
  const buf = Buffer.from(await exportRes.arrayBuffer());
  const isXlsx =
    exportRes.headers.get("content-type")?.includes("spreadsheetml") &&
    buf.subarray(0, 2).toString() === "PK" &&
    buf.length > 1000;
  results.push(
    `${exportRes.status === 200 && isXlsx ? "PASS" : "FAIL"} export Excel: status=${exportRes.status} bytes=${buf.length} zip=${buf.subarray(0, 2).toString() === "PK"}`
  );

  const noAuth = await fetch(`${base}/api/reports/export?month=${month}`, {
    redirect: "manual",
  });
  results.push(
    `${noAuth.status === 401 || noAuth.status === 307 ? "PASS" : "FAIL"} export ป้องกันไม่ล็อกอิน: status=${noAuth.status}`
  );

  await cleanup();
  results.push("PASS ล้างข้อมูลทดสอบเรียบร้อย");
}

main()
  .catch((e) => {
    results.push(`FAIL unexpected: ${e.message}`);
  })
  .finally(() => {
    console.log(results.join("\n"));
    return db.$disconnect();
  })
  .then(() => {
    if (results.some((r) => r.startsWith("FAIL"))) process.exit(1);
  });
