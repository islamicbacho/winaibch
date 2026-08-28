import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { createCase } from "@/lib/incident-flow";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const result = await createCase({
    studentIdRaw: String(body.studentId ?? "").trim(),
    fullName: String(body.fullName ?? "").trim(),
    classroomId: Number(body.classroomId),
    studentNo: String(body.studentNo ?? "").trim(),
    guardianName: String(body.guardianName ?? "").trim(),
    guardianPhone: String(body.guardianPhone ?? "").trim(),
    occurredAt: new Date(String(body.occurredAt ?? "")),
    knownVia: String(body.knownVia ?? "").trim(),
    description: String(body.description ?? "").trim(),
    behaviorIds: Array.isArray(body.behaviors)
      ? body.behaviors.map((v) => Number(v))
      : [],
    recordedById: session.uid,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ incidentId: result.incidentId });
}
