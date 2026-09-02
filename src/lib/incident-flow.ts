import { db } from "@/lib/db";
import { isSignatureRole, SIGNATURE_ROLES } from "@/lib/discipline";
import { saveStudentPhoto } from "@/lib/student-photo";

export type CreateCaseParams = {
  studentIdRaw: string;
  fullName: string;
  classroomId: number;
  studentNo: string;
  guardianName: string;
  guardianPhone: string;
  occurredAt: Date;
  knownVia: string;
  description: string;
  behaviorIds: number[];
  recordedById: number;
  studentPhoto?: string;
};

export async function createCase(
  params: CreateCaseParams
): Promise<{ ok: true; incidentId: number } | { ok: false; error: string }> {
  const { fullName, occurredAt, behaviorIds, recordedById } = params;
  const classroomId = params.classroomId;
  const studentPhoto = params.studentPhoto ?? "";

  if (!fullName) return { ok: false, error: "กรอกชื่อ-สกุลนักเรียน" };
  if (!Number.isInteger(classroomId) || classroomId <= 0)
    return { ok: false, error: "เลือกชั้นเรียน" };
  if (Number.isNaN(occurredAt.getTime())) return { ok: false, error: "วัน-เวลาไม่ถูกต้อง" };
  if (behaviorIds.length === 0)
    return { ok: false, error: "เลือกพฤติกรรมอย่างน้อย 1 รายการ" };

  const classroom = await db.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom) return { ok: false, error: "ชั้นเรียนไม่ถูกต้อง" };

  const validBehaviors = await db.behavior.findMany({
    where: { id: { in: behaviorIds } },
  });
  if (validBehaviors.length === 0)
    return { ok: false, error: "พฤติกรรมไม่ถูกต้อง" };

  let student = params.studentIdRaw
    ? await db.student.findUnique({ where: { id: Number(params.studentIdRaw) } })
    : null;
  if (!student) {
    student = await db.student.findFirst({ where: { fullName } });
  }
  if (student) {
    student = await db.student.update({
      where: { id: student.id },
      data: {
        fullName,
        classroomId,
        studentNo: params.studentNo,
        guardianName: params.guardianName,
        guardianPhone: params.guardianPhone,
      },
    });
  } else {
    student = await db.student.create({
      data: {
        fullName,
        classroomId,
        studentNo: params.studentNo,
        guardianName: params.guardianName,
        guardianPhone: params.guardianPhone,
      },
    });
  }

  if (studentPhoto) {
    const saved = await saveStudentPhoto(
      student.id,
      studentPhoto,
      validBehaviors[0]?.label ?? "โปรไฟล์นักเรียน"
    );
    if (!saved.ok) return { ok: false, error: saved.error };
  }

  const priorCount = await db.incident.count({ where: { studentId: student.id } });

  const incident = await db.incident.create({
    data: {
      studentId: student.id,
      classroomId,
      classroomText: `${classroom.level}${classroom.grade}/${classroom.roomNo}`,
      studentNo: params.studentNo,
      guardianName: params.guardianName,
      guardianPhone: params.guardianPhone,
      occurredAt,
      knownVia: params.knownVia,
      description: params.description,
      status: "recorded",
      measureLevel: Math.min(priorCount + 1, 4),
      recordedById,
      behaviors: {
        create: validBehaviors.map((b) => ({ behaviorId: b.id })),
      },
    },
  });

  return { ok: true, incidentId: incident.id };
}

export async function saveSignatureData(
  incidentId: number,
  role: string,
  signerName: string,
  imageData: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(incidentId) || incidentId <= 0)
    return { ok: false, error: "เคสไม่ถูกต้อง" };
  if (!isSignatureRole(role)) return { ok: false, error: "บทบาทไม่ถูกต้อง" };
  if (!signerName) return { ok: false, error: "กรอกชื่อผู้ลงนาม" };
  if (!imageData.startsWith("data:image/png;base64,"))
    return { ok: false, error: "รูปแบบลายเซ็นไม่ถูกต้อง" };
  if (imageData.length > 500_000)
    return { ok: false, error: "ไฟล์ลายเซ็นใหญ่เกินไป" };

  const incident = await db.incident.findUnique({ where: { id: incidentId } });
  if (!incident) return { ok: false, error: "ไม่พบเคส" };
  if (incident.status === "closed")
    return { ok: false, error: "เคสปิดแล้ว ไม่สามารถลงนามเพิ่มได้" };

  await db.signature.upsert({
    where: { incidentId_role: { incidentId, role } },
    update: { signerName, imageData, signedAt: new Date() },
    create: { incidentId, role, signerName, imageData },
  });

  return { ok: true };
}

export async function clearSignatureData(
  incidentId: number,
  role: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSignatureRole(role)) return { ok: false, error: "บทบาทไม่ถูกต้อง" };
  const incident = await db.incident.findUnique({ where: { id: incidentId } });
  if (!incident) return { ok: false, error: "ไม่พบเคส" };
  if (incident.status === "closed")
    return { ok: false, error: "เคสปิดแล้ว ไม่สามารถลบลายเซ็นได้" };

  await db.signature.deleteMany({ where: { incidentId, role } });
  return { ok: true };
}

export async function missingSignatures(incidentId: number): Promise<string[]> {
  const sigs = await db.signature.findMany({
    where: { incidentId },
    select: { role: true },
  });
  const have = new Set(sigs.map((s) => s.role));
  return SIGNATURE_ROLES.filter((r) => !have.has(r.role)).map((r) => r.label);
}

export async function closeCase(
  incidentId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(incidentId) || incidentId <= 0)
    return { ok: false, error: "เคสไม่ถูกต้อง" };

  const incident = await db.incident.findUnique({ where: { id: incidentId } });
  if (!incident) return { ok: false, error: "ไม่พบเคส" };
  if (incident.status !== "signing" && incident.status !== "corrective")
    return {
      ok: false,
      error: "ต้องบันทึก กจ.2 (แก้ไขความประพฤติ) แล้วจึงเข้าสู่ขั้นตอนลงนามและปิดเคส",
    };

  const missing = await missingSignatures(incidentId);
  if (missing.length > 0)
    return {
      ok: false,
      error: `ปิดเคสไม่ได้ — ต้องลงนามครบ 4 ฝ่าย (ขาด: ${missing.join(", ")})`,
    };

  await db.incident.update({ where: { id: incidentId }, data: { status: "closed" } });
  return { ok: true };
}
