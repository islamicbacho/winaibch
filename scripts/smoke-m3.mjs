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

async function check(label, path, expectStatus, expectText, withCookie = true) {
  const res = await fetch(base + path, {
    redirect: "manual",
    headers: withCookie ? { Cookie: cookie } : {},
  });
  const text = await res.text();
  const statusOk = res.status === expectStatus;
  const textOk = expectText ? text.includes(expectText) : true;
  results.push(
    `${statusOk && textOk ? "PASS" : "FAIL"} ${label}: status=${res.status}(${expectStatus})${expectText ? ` text[${expectText}]=${textOk}` : ""}`
  );
  return text;
}

async function main() {
  const classroom = await db.classroom.findFirst({ where: { level: "ม.", grade: 1 } });
  const behavior = await db.behavior.findFirst({ where: { label: "ทะเลาะวิวาท" } });
  if (!classroom || !behavior) throw new Error("missing seed data");

  const student = await db.student.create({
    data: {
      fullName: "ทดสอบ ระบบเคส",
      classroomId: classroom.id,
      studentNo: "99",
      guardianName: "ผู้ปกครองทดสอบ",
      guardianPhone: "0800000000",
    },
  });
  const incident = await db.incident.create({
    data: {
      studentId: student.id,
      classroomId: classroom.id,
      classroomText: `${classroom.level}${classroom.grade}/${classroom.roomNo}`,
      studentNo: "99",
      guardianName: "ผู้ปกครองทดสอบ",
      occurredAt: new Date(),
      knownVia: "เห็นเอง",
      description: "เคสทดสอบระบบ",
      status: "recorded",
      behaviors: { create: { behaviorId: behavior.id } },
    },
  });

  await check("list แสดงเคสทดสอบ", "/incidents", 200, "ทดสอบ ระบบเคส");
  await check("ฟอร์มบันทึกเหตุ", "/incidents/new", 200, "พฤติกรรมที่กระทำผิด");
  await check(
    "หน้าเคส (recorded → ฟอร์ม กจ.1)",
    `/incidents/${incident.id}`,
    200,
    "กจ.1 — บันทึกความเชิญผู้ปกครอง"
  );

  const searchRes = await fetch(
    `${base}/api/students/search?q=${encodeURIComponent("ทดสอบ")}`,
    { headers: { Cookie: cookie } }
  );
  const searchData = await searchRes.json();
  results.push(
    `${searchRes.status === 200 && Array.isArray(searchData) && searchData.some((s) => s.fullName === "ทดสอบ ระบบเคส") ? "PASS" : "FAIL"} api ค้นหานักเรียน: status=${searchRes.status} found=${Array.isArray(searchData) && searchData.length}`
  );

  const searchNoAuth = await fetch(
    `${base}/api/students/search?q=test`,
    { redirect: "manual" }
  );
  results.push(
    `${searchNoAuth.status === 401 || searchNoAuth.status === 307 ? "PASS" : "FAIL"} api ป้องกันไม่ล็อกอิน: status=${searchNoAuth.status}`
  );

  await db.incident.delete({ where: { id: incident.id } });
  await db.student.delete({ where: { id: student.id } });
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
