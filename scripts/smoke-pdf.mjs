import { createHmac } from "node:crypto";
import { readFileSync, unlinkSync, existsSync, readFileSync as rf } from "node:fs";
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
const createdFiles = [];

async function main() {
  const olds = await db.student.findMany({ where: { fullName: "ทดสอบ เซฟ PDF" } });
  for (const s of olds) {
    await db.incident.deleteMany({ where: { studentId: s.id } });
    await db.student.delete({ where: { id: s.id } });
  }

  const classroom = await db.classroom.findFirst({ where: { level: "ม.", grade: 3 } });
  const behavior = await db.behavior.findFirst({ where: { label: "สิ่งเสพติด (ระบุชนิด)" } });
  if (!classroom || !behavior) throw new Error("missing seed data");

  const student = await db.student.create({
    data: {
      fullName: "ทดสอบ เซฟ PDF",
      classroomId: classroom.id,
      studentNo: "66",
      guardianName: "ผู้ปกครองเซฟ PDF",
    },
  });

  const incident = await db.incident.create({
    data: {
      studentId: student.id,
      classroomId: classroom.id,
      classroomText: `${classroom.level}${classroom.grade}/${classroom.roomNo}`,
      studentNo: "66",
      guardianName: "ผู้ปกครองเซฟ PDF",
      occurredAt: new Date(),
      knownVia: "เห็นเอง",
      status: "summoned",
      behaviors: { create: { behaviorId: behavior.id } },
      summon: {
        create: {
          docNo: "77/2569",
          meetingDate: new Date(),
          meetingTime: "10:00",
          meetingPlace: "ห้องผู้อำนวยการโรงเรียนบาเจาะ",
        },
      },
    },
  });

  const emptyIncident = await db.incident.create({
    data: {
      studentId: student.id,
      classroomId: classroom.id,
      classroomText: "ม.3/1",
      occurredAt: new Date(),
      status: "recorded",
      behaviors: { create: { behaviorId: behavior.id } },
    },
  });

  const saveRes = await fetch(`${base}/api/docs/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ docType: "g1", incidentId: incident.id }),
  });
  const saveJson = await saveRes.json();
  let fileOk = false;
  let pdfHeader = "";
  if (saveRes.status === 200 && saveJson.path) {
    createdFiles.push(saveJson.path);
    if (existsSync(saveJson.path)) {
      pdfHeader = rf(saveJson.path).subarray(0, 5).toString();
      fileOk = pdfHeader === "%PDF-";
    }
  }
  results.push(
    `${saveRes.status === 200 && fileOk ? "PASS" : "FAIL"} เซฟ กจ.1 PDF: status=${saveRes.status} file=${saveJson.path ?? "-"} header=${pdfHeader}`
  );

  const noAuth = await fetch(`${base}/api/docs/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docType: "g1", incidentId: incident.id }),
    redirect: "manual",
  });
  results.push(
    `${noAuth.status === 401 || noAuth.status === 307 ? "PASS" : "FAIL"} save ไม่ล็อกอิน: status=${noAuth.status}`
  );

  const early = await fetch(`${base}/api/docs/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ docType: "g11", incidentId: emptyIncident.id }),
  });
  results.push(
    `${early.status === 400 ? "PASS" : "FAIL"} save กจ.1.1 ก่อนถึงขั้น → 400: status=${early.status}`
  );

  await db.incident.delete({ where: { id: incident.id } });
  await db.incident.delete({ where: { id: emptyIncident.id } });
  await db.student.delete({ where: { id: student.id } });
  for (const f of createdFiles) {
    if (existsSync(f)) unlinkSync(f);
  }
  results.push("PASS ล้างข้อมูล+ไฟล์ทดสอบเรียบร้อย");
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
