"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { ActionState } from "@/lib/types";

export async function createClassroom(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const level = String(formData.get("level") ?? "").trim();
  const grade = Number(formData.get("grade"));
  const roomNo = Number(formData.get("roomNo"));
  const advisorName = String(formData.get("advisorName") ?? "").trim();

  if (level !== "ป." && level !== "ม.") return { error: "เลือกระดับชั้น" };
  if (!Number.isInteger(grade) || grade < 1 || grade > 9)
    return { error: "เลขชั้นปีต้องเป็น 1-9" };
  if (!Number.isInteger(roomNo) || roomNo < 1)
    return { error: "เลขที่ห้องต้องเป็นจำนวนเต็มบวก" };

  const dup = await db.classroom.findUnique({
    where: { level_grade_roomNo: { level, grade, roomNo } },
  });
  if (dup) return { error: "มีห้องเรียนนี้อยู่แล้ว" };

  await db.classroom.create({ data: { level, grade, roomNo, advisorName } });
  revalidatePath("/classes");
  return { success: `เพิ่มห้อง ${level}${grade}/${roomNo} เรียบร้อย` };
}

export async function updateAdvisor(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = Number(formData.get("id"));
  const advisorName = String(formData.get("advisorName") ?? "").trim();

  try {
    await db.classroom.update({ where: { id }, data: { advisorName } });
  } catch {
    return { error: "บันทึกไม่สำเร็จ ลองอีกครั้ง" };
  }
  revalidatePath("/classes");
  return {};
}

export async function deleteClassroom(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = Number(formData.get("id"));

  try {
    await db.classroom.delete({ where: { id } });
  } catch {
    return { error: "ลบไม่สำเร็จ ลองอีกครั้ง" };
  }
  revalidatePath("/classes");
  return {};
}
