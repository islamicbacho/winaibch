"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

const SETTING_KEYS = [
  "schoolName",
  "officeName",
  "academicYear",
  "directorName",
  "directorPosition",
  "deputyName",
  "deputyPosition",
  "docCounter",
  "savePath",
] as const;

export async function updateSettings(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const values: Record<string, string> = {};

  for (const key of SETTING_KEYS) {
    values[key] = String(formData.get(key) ?? "").trim();
  }

  for (const key of ["schoolName", "directorName", "deputyName"]) {
    if (!values[key]) return { error: "กรอกข้อมูลที่จำเป็นให้ครบ (ชื่อโรงเรียน, ผอ., รองผอ.)" };
  }
  if (values.docCounter && !/^\d+$/.test(values.docCounter))
    return { error: "เลขที่หนังสือต้องเป็นตัวเลขเท่านั้น" };
  if (values.academicYear && !/^\d{4}$/.test(values.academicYear))
    return { error: "ปีการศึกษาต้องเป็น พ.ศ. 4 หลัก" };

  for (const key of SETTING_KEYS) {
    await db.setting.upsert({
      where: { key },
      update: { value: values[key] },
      create: { key, value: values[key] },
    });
  }

  revalidatePath("/settings");
  return { success: "บันทึกการตั้งค่าเรียบร้อย" };
}

export async function createBehavior(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "กรอกชื่อพฤติกรรม" };

  const dup = await db.behavior.findFirst({ where: { label } });
  if (dup) return { error: "มีพฤติกรรมนี้อยู่แล้ว" };

  const max = await db.behavior.aggregate({ _max: { sortOrder: true } });
  await db.behavior.create({
    data: { label, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  });

  revalidatePath("/settings");
  return { success: "เพิ่มพฤติกรรมเรียบร้อย" };
}

export async function updateBehaviorLabel(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = Number(formData.get("id"));
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "กรอกชื่อพฤติกรรม" };

  try {
    await db.behavior.update({ where: { id }, data: { label } });
  } catch {
    return { error: "บันทึกไม่สำเร็จ" };
  }
  revalidatePath("/settings");
  return {};
}

export async function toggleBehavior(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = Number(formData.get("id"));
  const behavior = await db.behavior.findUnique({ where: { id } });
  if (!behavior) return { error: "ไม่พบรายการ" };

  await db.behavior.update({ where: { id }, data: { isActive: !behavior.isActive } });
  revalidatePath("/settings");
  return {};
}

export async function moveBehavior(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = Number(formData.get("id"));
  const dir = String(formData.get("dir") ?? "");

  const all = await db.behavior.findMany({ orderBy: { sortOrder: "asc" } });
  const idx = all.findIndex((b) => b.id === id);
  if (idx < 0) return { error: "ไม่พบรายการ" };

  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= all.length) return {};

  await db.$transaction([
    db.behavior.update({
      where: { id: all[idx].id },
      data: { sortOrder: all[swapIdx].sortOrder },
    }),
    db.behavior.update({
      where: { id: all[swapIdx].id },
      data: { sortOrder: all[idx].sortOrder },
    }),
  ]);

  revalidatePath("/settings");
  return {};
}

export async function deleteBehavior(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = Number(formData.get("id"));

  const used = await db.incidentBehavior.count({ where: { behaviorId: id } });
  if (used > 0)
    return { error: "พฤติกรรมนี้ถูกใช้ในเคสอยู่ ให้ปิดใช้งานแทนการลบ" };

  try {
    await db.behavior.delete({ where: { id } });
  } catch {
    return { error: "ลบไม่สำเร็จ" };
  }
  revalidatePath("/settings");
  return {};
}

export async function changePassword(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { error: "หมดเซสชัน กรุณาเข้าสู่ระบบใหม่" };

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const user = await db.user.findUnique({ where: { id: session.uid } });
  if (!user || !verifyPassword(current, user.passwordHash))
    return { error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" };
  if (next.length < 6) return { error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" };
  if (next !== confirm) return { error: "รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน" };

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(next) },
  });

  return { success: "เปลี่ยนรหัสผ่านเรียบร้อย" };
}
