"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { closeCase, createCase } from "@/lib/incident-flow";
import type { ActionState } from "@/lib/types";

export async function createIncident(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "หมดเซสชัน กรุณาเข้าสู่ระบบใหม่" };

  const occurredAtRaw = String(formData.get("occurredAt") ?? "");
  if (!occurredAtRaw) return { error: "ระบุวัน-เวลาที่เกิดเหตุ" };
  const occurredAt = new Date(occurredAtRaw);
  if (Number.isNaN(occurredAt.getTime())) return { error: "วัน-เวลาไม่ถูกต้อง" };

  const result = await createCase({
    studentIdRaw: String(formData.get("studentId") ?? "").trim(),
    fullName: String(formData.get("fullName") ?? "").trim(),
    classroomId: Number(formData.get("classroomId")),
    studentNo: String(formData.get("studentNo") ?? "").trim(),
    guardianName: String(formData.get("guardianName") ?? "").trim(),
    guardianPhone: String(formData.get("guardianPhone") ?? "").trim(),
    occurredAt,
    knownVia: String(formData.get("knownVia") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    behaviorIds: formData
      .getAll("behaviors")
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n) && n > 0),
    recordedById: session.uid,
  });

  if (!result.ok) return { error: result.error };

  revalidatePath("/incidents");
  revalidatePath("/students");
  redirect(`/incidents/${result.incidentId}`);
}

async function loadIncidentForStep(incidentId: number, expectedStatus: string) {
  const incident = await db.incident.findUnique({
    where: { id: incidentId },
    include: { summon: true, agreement: true, correction: true },
  });
  if (!incident) return { error: "ไม่พบเคส" } as const;
  if (incident.status !== expectedStatus)
    return { error: "เคสนี้ดำเนินการขั้นตอนนี้ไปแล้วหรือยังไม่ถึงขั้นตอนนี้" } as const;
  return { incident } as const;
}

export async function skipToCorrection(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const incidentId = Number(formData.get("incidentId"));
  if (!Number.isInteger(incidentId)) return { error: "เคสไม่ถูกต้อง" };

  const incident = await db.incident.findUnique({ where: { id: incidentId } });
  if (!incident) return { error: "ไม่พบเคส" };
  if (incident.status !== "recorded")
    return { error: "เคสนี้ดำเนินการขั้นตอนนี้ไปแล้ว" };
  if (incident.measureLevel !== 1)
    return { error: "เฉพาะมาตรการครั้งที่ 1 (ตักเตือน) จึงข้ามการนัดผู้ปกครองได้" };

  await db.incident.update({
    where: { id: incidentId },
    data: { status: "agreement" },
  });

  revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/incidents");
  return { success: "ข้ามการนัดผู้ปกครองแล้ว — ไปขั้น กจ.2 ถัดไป" };
}

export async function createSummon(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const incidentId = Number(formData.get("incidentId"));
  const meetingDate = String(formData.get("meetingDate") ?? "");
  const meetingTime = String(formData.get("meetingTime") ?? "").trim();
  const meetingPlace =
    String(formData.get("meetingPlace") ?? "").trim() || "ห้องผู้อำนวยการโรงเรียนบาเจาะ";

  if (!Number.isInteger(incidentId)) return { error: "เคสไม่ถูกต้อง" };
  if (!meetingDate) return { error: "ระบุวันที่นัดผู้ปกครอง" };
  const date = new Date(meetingDate);
  if (Number.isNaN(date.getTime())) return { error: "วันที่ไม่ถูกต้อง" };

  const result = await loadIncidentForStep(incidentId, "recorded");
  if ("error" in result) return { error: result.error };

  const counterSetting = await db.setting.findUnique({ where: { key: "docCounter" } });
  const counter = (Number(counterSetting?.value ?? "0") || 0) + 1;
  const yearSetting = await db.setting.findUnique({ where: { key: "academicYear" } });
  const docNo = `${counter}/${yearSetting?.value ?? "2569"}`;

  await db.$transaction([
    db.summon.create({
      data: { incidentId, docNo, meetingDate: date, meetingTime, meetingPlace },
    }),
    db.setting.upsert({
      where: { key: "docCounter" },
      update: { value: String(counter) },
      create: { key: "docCounter", value: String(counter) },
    }),
    db.incident.update({ where: { id: incidentId }, data: { status: "summoned" } }),
  ]);

  revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/incidents");
  return { success: "บันทึก กจ.1 (เชิญผู้ปกครอง) เรียบร้อย เลขที่หนังสือ " + docNo };
}

export async function createAgreement(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const incidentId = Number(formData.get("incidentId"));
  const behaviorDetail = String(formData.get("behaviorDetail") ?? "").trim();
  const goodDeedText = String(formData.get("goodDeedText") ?? "").trim();
  const deadline = String(formData.get("deadline") ?? "");

  if (!Number.isInteger(incidentId)) return { error: "เคสไม่ถูกต้อง" };
  if (!goodDeedText) return { error: "ระบุความดีที่ให้นักเรียนทดแทน" };

  const result = await loadIncidentForStep(incidentId, "summoned");
  if ("error" in result) return { error: result.error };

  let deadlineDate: Date | null = null;
  if (deadline) {
    deadlineDate = new Date(deadline);
    if (Number.isNaN(deadlineDate.getTime())) return { error: "กำหนดเวลาไม่ถูกต้อง" };
  }

  await db.$transaction([
    db.agreement.create({
      data: {
        incidentId,
        behaviorDetail,
        goodDeedText,
        deadline: deadlineDate,
      },
    }),
    db.incident.update({ where: { id: incidentId }, data: { status: "agreement" } }),
  ]);

  revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/incidents");
  return { success: "บันทึก กจ.1.1 (ข้อตกลง) เรียบร้อย" };
}

const CORRECTION_ACTIONS = ["advise", "gooddeeds", "work", "counsel"] as const;

export async function createCorrection(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const incidentId = Number(formData.get("incidentId"));
  const actions = formData.getAll("actions").map(String).filter((a) =>
    (CORRECTION_ACTIONS as readonly string[]).includes(a)
  );
  const suggestion = String(formData.get("suggestion") ?? "").trim();
  const directorOpinion = String(formData.get("directorOpinion") ?? "").trim();
  const deadlineGooddeeds = String(formData.get("deadline_gooddeeds") ?? "").trim();
  const deadlineWork = String(formData.get("deadline_work") ?? "").trim();

  if (!Number.isInteger(incidentId)) return { error: "เคสไม่ถูกต้อง" };
  if (actions.length === 0) return { error: "เลือกมาตรการแก้ไขอย่างน้อย 1 อย่าง" };
  if (actions.includes("gooddeeds") && !deadlineGooddeeds)
    return { error: "ระบุวันที่ครบกำหนดของการทำความดีเพื่อชดใช้ความผิด" };
  if (actions.includes("work") && !deadlineWork)
    return { error: "ระบุวันที่ครบกำหนดของการช่วยงานตามความสามารถ" };
  if (!directorOpinion)
    return { error: "ระบุความเห็นของผู้อำนวยการสถานศึกษา (บังคับทุกเคส)" };

  const result = await loadIncidentForStep(incidentId, "agreement");
  if ("error" in result) return { error: result.error };

  const actionsData = actions.map((code) => ({
    code,
    deadline:
      code === "gooddeeds"
        ? deadlineGooddeeds
        : code === "work"
          ? deadlineWork
          : null,
  }));

  await db.$transaction([
    db.correction.create({
      data: { incidentId, actions: JSON.stringify(actionsData), suggestion },
    }),
    db.incident.update({
      where: { id: incidentId },
      data: { status: "signing", directorOpinion },
    }),
  ]);

  revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/incidents");
  return { success: "บันทึก กจ.2 เรียบร้อย — ขั้นถัดไป: ลงนามอิเล็กทรอนิกส์ครบ 4 ฝ่าย" };
}

export async function closeIncident(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const incidentId = Number(formData.get("incidentId"));

  const result = await closeCase(incidentId);

  revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/incidents");
  if (!result.ok) return { error: result.error };
  return { success: "ปิดเคสเรียบร้อย — ลงนามครบ 4 ฝ่าย" };
}

export async function deleteIncident(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const incidentId = Number(formData.get("incidentId") ?? formData.get("id"));
  if (!Number.isInteger(incidentId)) return { error: "เคสไม่ถูกต้อง" };

  const incident = await db.incident.findUnique({ where: { id: incidentId } });
  if (!incident) return { error: "ไม่พบเคส" };

  await db.incident.delete({ where: { id: incidentId } });

  revalidatePath("/incidents");
  revalidatePath("/students");
  revalidatePath("/");
  revalidatePath("/reports");
  revalidatePath(`/incidents/${incidentId}`);
  redirect("/incidents");
}
