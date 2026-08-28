import { createHmac } from "node:crypto";
import { readFileSync, existsSync, unlinkSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const secret = env.match(/SESSION_SECRET="(.+)"/)[1];
const db = new PrismaClient();

function makeToken() {
  const payload = { uid: 1, name: "admin", exp: Math.floor(Date.now() / 1000) + 3600 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `aibch_session=${body}.${sig}`;
}

const base = "http://localhost:3000";
const cookie = makeToken();
const jsonHeaders = { "Content-Type": "application/json", Cookie: cookie };
const results = [];
const createdFiles = [];
const TEST_NAME = "ทดสอบ ลายเซ็น";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

async function cleanupTestStudent() {
  const olds = await db.student.findMany({ where: { fullName: TEST_NAME } });
  for (const s of olds) {
    await db.incident.deleteMany({ where: { studentId: s.id } });
    await db.student.delete({ where: { id: s.id } });
  }
}

async function main() {
  await cleanupTestStudent();

  const classroom = await db.classroom.findFirst({ where: { level: "ม.", grade: 4 } });
  const behavior = await db.behavior.findFirst();
  if (!classroom || !behavior) throw new Error("missing seed data");

  const createRes1 = await fetch(`${base}/api/incidents`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      fullName: TEST_NAME,
      classroomId: classroom.id,
      occurredAt: new Date().toISOString(),
      knownVia: "เห็นเอง",
      behaviors: [behavior.id],
    }),
  });
  const case1 = await createRes1.json();
  results.push(
    `${createRes1.status === 200 && case1.incidentId ? "PASS" : "FAIL"} สร้างเคส 1 ผ่าน API: status=${createRes1.status} ${JSON.stringify(case1)}`
  );
  const c1 = await db.incident.findUnique({ where: { id: case1.incidentId } });
  results.push(
    `${c1?.measureLevel === 1 ? "PASS" : "FAIL"} เคสแรกมาตรการระดับ 1 (ตักเตือน): level=${c1?.measureLevel}`
  );

  const createRes2 = await fetch(`${base}/api/incidents`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      fullName: TEST_NAME,
      classroomId: classroom.id,
      occurredAt: new Date().toISOString(),
      knownVia: "เห็นเอง",
      behaviors: [behavior.id],
    }),
  });
  const case2 = await createRes2.json();
  results.push(
    `${createRes2.status === 200 && case2.incidentId ? "PASS" : "FAIL"} สร้างเคส 2 (ชื่อเดิม ผูกประวัติ): status=${createRes2.status}`
  );
  const c2 = await db.incident.findUnique({ where: { id: case2.incidentId } });
  results.push(
    `${c2?.measureLevel === 2 ? "PASS" : "FAIL"} เคสที่สองมาตรการระดับ 2 (สาธารณะประโยชน์): level=${c2?.measureLevel}`
  );

  await db.incident.update({
    where: { id: case2.incidentId },
    data: {
      status: "corrective",
      directorOpinion: "ให้ทำความดีทดแทนและติดตามผล",
      agreement: {
        create: { behaviorDetail: "ทะเลาะวิวาท", goodDeedText: "ทำงานอาสา 1 สัปดาห์" },
      },
      correction: {
        create: { actions: JSON.stringify(["gooddeeds"]), suggestion: "ติดตามทุกสัปดาห์" },
      },
    },
  });

  const earlyClose = await fetch(`${base}/api/incidents/close`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ incidentId: case2.incidentId }),
  });
  const earlyJson = await earlyClose.json();
  results.push(
    `${earlyClose.status === 400 && String(earlyJson.error).includes("ลงนาม") ? "PASS" : "FAIL"} ปิดเคสก่อนลงนาม → 400: ${earlyJson.error ?? ""}`
  );

  for (const role of ["student", "parent", "patrol", "director"]) {
    const res = await fetch(`${base}/api/signatures`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        incidentId: case2.incidentId,
        role,
        signerName: `ผู้ลงนาม-${role}`,
        imageData: TINY_PNG,
      }),
    });
    results.push(`${res.status === 200 ? "PASS" : "FAIL"} ลงนาม ${role}: status=${res.status}`);
  }

  const sigCount = await db.signature.count({ where: { incidentId: case2.incidentId } });
  results.push(`${sigCount === 4 ? "PASS" : "FAIL"} ลายเซ็นครบ 4: count=${sigCount}`);

  const closeRes = await fetch(`${base}/api/incidents/close`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ incidentId: case2.incidentId }),
  });
  results.push(
    `${closeRes.status === 200 ? "PASS" : "FAIL"} ปิดเคสหลังลงนามครบ: status=${closeRes.status}`
  );

  const closed = await db.incident.findUnique({ where: { id: case2.incidentId } });
  results.push(
    `${closed?.status === "closed" && closed?.directorOpinion ? "PASS" : "FAIL"} สถานะ closed + มีความเห็น ผอ.: ${closed?.status}`
  );

  const pdfRes = await fetch(`${base}/api/docs/save`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ docType: "g11", incidentId: case2.incidentId }),
  });
  const pdfJson = await pdfRes.json();
  if (pdfJson.path) createdFiles.push(pdfJson.path);
  const pdfOk = pdfRes.status === 200 && pdfJson.path && existsSync(pdfJson.path);
  results.push(
    `${pdfOk ? "PASS" : "FAIL"} เซฟ PDF กจ.1.1 (ฝังลายเซ็น): status=${pdfRes.status} file=${pdfJson.path ?? "-"}`
  );

  const case1Close = await fetch(`${base}/api/incidents/close`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ incidentId: case1.incidentId }),
  });
  const case1Json = await case1Close.json();
  results.push(
    `${case1Close.status === 400 && String(case1Json.error).includes("กจ.2") ? "PASS" : "FAIL"} ปิดเคสที่ยังไม่ถึง กจ.2 → 400: ${case1Json.error ?? ""}`
  );

  await cleanupTestStudent();
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
