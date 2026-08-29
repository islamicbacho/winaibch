import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getCredentials, diagnoseCredentials } from "@/lib/drive";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const diag = diagnoseCredentials();
  console.log("[drivediag]", JSON.stringify(diag));
  return NextResponse.json(diag);
}

export function GET() {
  void getCredentials;
  return NextResponse.json({ ok: true });
}