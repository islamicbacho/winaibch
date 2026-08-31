import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateAndSaveDocPdf } from "@/lib/doc-pdf";
import { isDriveConfigured, getStudentDriveFolder } from "@/lib/drive";
import { DOC_TYPE_LABELS, type DocType } from "@/lib/doc-data";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { docType?: string; incidentId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const docType = body.docType as DocType;
  const incidentId = Number(body.incidentId);

  if (!(docType in DOC_TYPE_LABELS) || !Number.isInteger(incidentId) || incidentId <= 0) {
    return NextResponse.json({ error: "พารามิเตอร์ไม่ถูกต้อง" }, { status: 400 });
  }

  const driveConfig = isDriveConfigured();

  let driveFolderId: string | undefined;
  if (driveConfig) {
    const incident = await db.incident.findUnique({
      where: { id: incidentId },
      include: {
        student: true,
        behaviors: { include: { behavior: true } },
      },
    });
    if (incident) {
      driveFolderId = await getStudentDriveFolder({
        category: incident.behaviors[0]?.behavior.label ?? "ไม่ระบุ",
        title: incident.student.fullName,
        description: incident.studentNo,
      });
    }
  }

  const result = await generateAndSaveDocPdf(docType, incidentId, driveFolderId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    path: result.path,
    filename: result.filename,
    webViewLink: (result as { webViewLink?: string }).webViewLink ?? result.path,
  });
}
