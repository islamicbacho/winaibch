import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { closeCase } from "@/lib/incident-flow";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { incidentId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const result = await closeCase(Number(body.incidentId));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
