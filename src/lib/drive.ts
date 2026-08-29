import { google } from "googleapis";
import { Readable } from "node:stream";

function getCredentials(): Record<string, unknown> {
  const jsonStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!jsonStr) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");
  }

  const normalize = (s: string): string =>
    s
      .trim()
      .replace(/^"+|"+$/g, "")
      .replace(/\\u0022|\\u0027|%22/g, '"')
      .replace(/[\u0000-\u001f]/g, (ch) =>
        ch === "\n" ? "\\n" : ch === "\r" ? "\\r" : ch === "\t" ? "\\t" : JSON.stringify(ch).slice(1, -1)
      )
      .replace(/\\(n|t|r|b|f|")/g, "$1");

  const layers = [jsonStr, normalize(jsonStr), JSON.parse(normalize(jsonStr))];
  for (const layer of layers) {
    if (typeof layer !== "string") {
      if (layer && typeof layer === "object") return layer as Record<string, unknown>;
      continue;
    }
    try {
      const parsed = JSON.parse(layer);
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      // keep trying next layer
    }
  }
  throw new Error(
    "GOOGLE_SERVICE_ACCOUNT_JSON invalid: expected a JSON object (type/private_key/client_email)"
  );
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
