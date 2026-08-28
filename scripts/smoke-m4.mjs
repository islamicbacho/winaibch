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
  const ok = res.status === expectStatus && (!expectText || text.includes(expectText));
  results.push(
    `${ok ? "PASS" : "FAIL"} ${label}: status=${res.status}(${expectStatus})${expectText ? ` text[${expectText}]=${text.includes(expectText)}` : ""}`
  );
}

async function main() {
  const classroom = await db.classroom.findFirst({
    where: { level: "ม.", grade: 1 },
  });
  const behavior = await db.behavior.findFirst({ where: { label: "หนีเรียน" } });
  if (!classroom || !behavior) throw new Error("missing seed data");

  const student = await db.student.create({
    data: {
      fullName: "ทดสอบ พิมพ์เอกสาร",
      classroomId: classroom.id,
      studentNo: "88",
      guardianName: "ผู้ปกครองพิมพ์เอกสาร",
    },
  });

  const incident = await db.incident.create({
    data: {
      studentId: student.id,
      classroomId: classroom.id,
      classroomText: `${classroom.level}${classroom.grade}/${classroom.roomNo}`,
      studentNo: "88",
      guardianName: "ผู้ปกครองพิมพ์เอกสาร",
      occurredAt: new Date(),
      knownVia: "เห็นเอง",
      status: "corrective",
      behaviors: { create: { behaviorId: behavior.id } },
      summon: {
        create: {
          docNo: "99/2569",
          meetingDate: new Date(),
          meetingTime: "09:00",
          meetingPlace: "ห้องผู้อำนวยการโรงเรียนบาเจาะ",
        },
      },
      agreement: {
        create: {
          behaviorDetail: "หนีเรียน",
          goodDeedText: "ทำงานอาสา 1 สัปดาห์",
        },
      },
      correction: {
        create: {
          actions: JSON.stringify(["advise", "gooddeeds"]),
          suggestion: "ติดตามพฤติกรรมทุกสัปดาห์",
        },
      },
    },
  });

  const emptyIncident = await db.incident.create({
    data: {
      studentId: student.id,
      classroomId: classroom.id,
      classroomText: "ม.1/1",
      occurredAt: new Date(),
      status: "recorded",
      behaviors: { create: { behaviorId: behavior.id } },
    },
  });

  await check("กจ.1 พิมพ์ได้", `/print/g1/${incident.id}`, 200, "บันทึกความ");
  await check("กจ.1 มีเลขที่หนังสือ", `/print/g1/${incident.id}`, 200, "99/2569");
  await check("กจ.1.1 พิมพ์ได้", `/print/g11/${incident.id}`, 200, "แบบข้อตกลงการฝึกความประพฤติเรียนรู้");
  await check("กจ.1.1 มีความดีทดแทน", `/print/g11/${incident.id}`, 200, "ทำงานอาสา 1 สัปดาห์");
  await check("กจ.2 พิมพ์ได้", `/print/g2/${incident.id}`, 200, "การดำเนินการแก้ไขความประพฤติของนักเรียน");
  await check("กจ.1.1 ยังไม่ถึงขั้น → 404", `/print/g11/${emptyIncident.id}`, 404, null);
  await check("docType ไม่ถูกต้อง → 404", `/print/xxx/${incident.id}`, 404, null);
  await check("print ไม่ล็อกอิน → redirect", `/print/g1/${incident.id}`, 307, null, false);

  await db.incident.delete({ where: { id: incident.id } });
  await db.incident.delete({ where: { id: emptyIncident.id } });
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
