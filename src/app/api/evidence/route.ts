import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isDriveConfigured, uploadFileToDrive } from "@/lib/drive";

const MAX_IMAGE_CHARS = 4_500_000;

type UploadBody = {
  incidentId?: number;
  title?: string;
  description?: string;
  imageData?: string;
};

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: UploadBody;
  try {
    body = (await request.json()) as UploadBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const incidentId = Number(body.incidentId);
  if (!Number.isInteger(incidentId) || incidentId <= 0) {
    return NextResponse.json({ error: "incidentId required" }, { status: 400 });
  }

  const incident = await db.incident.findUnique({ where: { id: incidentId } });
  if (!incident) return NextResponse.json({ error: "incident not found" }, { status: 404 });

  const imageData = body.imageData ?? "";
  const mimeMatch = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!mimeMatch) return NextResponse.json({ error: "imageData must be a base64 data URL" }, { status: 400 });
  if (imageData.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: "image too large" }, { status: 400 });
  }

  if (!isDriveConfigured()) {
    return NextResponse.json({ error: "google drive not configured" }, { status: 503 });
  }

  const ext = mimeMatch[1] === "png" ? "png" : mimeMatch[1] === "webp" ? "webp" : "jpg";
  const mimeType = mimeMatch[1] === "png" ? "image/png" : mimeMatch[1] === "webp" ? "image/webp" : "image/jpeg";
  const buffer = Buffer.from(mimeMatch[2], "base64");
  const filename = `evidence_${incidentId}_${Date.now()}.${ext}`;

  try {
    const uploaded = await uploadFileToDrive(buffer, filename, { mimeType });
    const evidence = await db.evidence.create({
      data: {
        incidentId,
        driveFileId: uploaded.id,
        driveWebViewLink: uploaded.webViewLink,
        filename,
        title: (body.title ?? "").trim(),
        description: (body.description ?? "").trim(),
        mimeType,
      },
    });
    return NextResponse.json({
      ok: true,
      evidence: {
        id: evidence.id,
        driveFileId: evidence.driveFileId,
        driveWebViewLink: evidence.driveWebViewLink,
        filename: evidence.filename,
        title: evidence.title,
        description: evidence.description,
        mimeType: evidence.mimeType,
        createdAt: evidence.createdAt,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `upload failed: ${(e as Error).message}` },
      { status: 500 }
    );
  }
}

type DeleteBody = { id?: number };

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: DeleteBody;
  try {
    body = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await db.evidence.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}