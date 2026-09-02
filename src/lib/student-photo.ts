import { db } from "@/lib/db";
import { getStudentDriveFolder, isDriveConfigured, uploadFileToDrive } from "@/lib/drive";

export function photoThumbUrl(driveId: string, sz = 480): string {
  if (!driveId) return "";
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w${sz}`;
}

export async function saveStudentPhoto(
  studentId: number,
  imageData: string,
  category?: string
): Promise<{ ok: true; photoDriveId: string; photoLink: string } | { ok: false; error: string }> {
  const mimeMatch = imageData.match(
    /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/
  );
  if (!mimeMatch) return { ok: false, error: "imageData ต้องเป็น data URL ของรูปภาพ" };
  if (imageData.length > 4_500_000) return { ok: false, error: "รูปภาพใหญ่เกินไป" };
  if (!isDriveConfigured()) return { ok: false, error: "google drive not configured" };

  const student = await db.student.findUnique({ where: { id: studentId } });
  if (!student) return { ok: false, error: "ไม่พบนักเรียน" };

  if (!category) {
    const last = await db.incident.findFirst({
      where: { studentId },
      orderBy: { occurredAt: "desc" },
      include: { behaviors: { include: { behavior: true } } },
    });
    category = last?.behaviors[0]?.behavior.label ?? "โปรไฟล์นักเรียน";
  }

  const ext =
    mimeMatch[1] === "png" ? "png" : mimeMatch[1] === "webp" ? "webp" : "jpg";
  const mimeType =
    mimeMatch[1] === "png"
      ? "image/png"
      : mimeMatch[1] === "webp"
        ? "image/webp"
        : "image/jpeg";
  const buffer = Buffer.from(mimeMatch[2], "base64");
  const filename = `profile_${student.id}_${Date.now()}.${ext}`;

  const folderId = await getStudentDriveFolder({
    category: category ?? "โปรไฟล์นักเรียน",
    title: student.fullName,
    description: student.studentNo,
  });

  const uploaded = await uploadFileToDrive(buffer, filename, { mimeType, folderId });

  await db.student.update({
    where: { id: studentId },
    data: { photoDriveId: uploaded.id, photoLink: uploaded.webViewLink },
  });

  return { ok: true, photoDriveId: uploaded.id, photoLink: uploaded.webViewLink };
}