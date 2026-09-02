import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { saveStudentPhoto } from "@/lib/student-photo";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { studentId?: number; imageData?: string };
  try {
    body = (await request.json()) as { studentId?: number; imageData?: string };
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const studentId = Number(body.studentId);
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return NextResponse.json({ error: "studentId required" }, { status: 400 });
  }

  const result = await saveStudentPhoto(studentId, body.imageData ?? "");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    photoDriveId: result.photoDriveId,
    photoLink: result.photoLink,
  });
}