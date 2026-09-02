import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { generateStudentProfilePdf } from "@/lib/profile-pdf";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { studentId?: number };
  try {
    body = (await request.json()) as { studentId?: number };
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const studentId = Number(body.studentId);
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return NextResponse.json({ error: "studentId ไม่ถูกต้อง" }, { status: 400 });
  }

  const result = await generateStudentProfilePdf(studentId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    path: result.path,
    filename: result.filename,
    webViewLink: result.webViewLink ?? result.path,
  });
}