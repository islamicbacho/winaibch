import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getCredentials, diagnoseCredentials } from "@/lib/drive";

export function GET() {
  const sessionPromise = getSession();
  return sessionPromise.then((session) => {
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const diag = diagnoseCredentials();
    console.log("[drivediag]", JSON.stringify(diag));
    return NextResponse.json(diag);
  }).catch(() => NextResponse.json({ error: "unauthorized" }, { status: 401 }));
}

void getCredentials;