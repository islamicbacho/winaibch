import { google } from "googleapis";
import { Readable } from "node:stream";

function getCredentials(): Record<string, unknown> {
  const jsonStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (jsonStr) {
    return JSON.parse(jsonStr) as Record<string, unknown>;
  }
  throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");
}

export function isDriveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_DRIVE_FOLDER_ID
  );
}

export async function uploadToDrive(
  buffer: Buffer,
  filename: string
): Promise<{ id: string; webViewLink: string }> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
  const credentials = getCredentials();

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType: "application/pdf",
      body: Readable.from(buffer),
    },
    fields: "id, webViewLink",
  });

  const fileId = res.data.id!;

  try {
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    });
  } catch {
    // ignore permission error (folder may restrict)
  }

  return {
    id: fileId,
    webViewLink: res.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`,
  };
}
