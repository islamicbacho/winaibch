import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { saveSignatureData, clearSignatureData } from "@/lib/incident-flow";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { incidentId?: number; role?: string; signerName?: string; imageData?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const result = await saveSignatureData(
    Number(body.incidentId),
    String(body.role ?? ""),
    String(body.signerName ?? "").trim(),
    String(body.imageData ?? "")
  );

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { incidentId?: number; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const result = await clearSignatureData(Number(body.incidentId), String(body.role ?? ""));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
