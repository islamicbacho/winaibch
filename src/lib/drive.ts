import { google } from "googleapis";
import { Readable } from "node:stream";

const SERVICE_ACCOUNT_B64_ENV = "GOOGLE_SERVICE_ACCOUNT_B64";
const SERVICE_ACCOUNT_JSON_ENV = "GOOGLE_SERVICE_ACCOUNT_JSON";

function getCredentials(): Record<string, unknown> {
  const b64 = process.env[SERVICE_ACCOUNT_B64_ENV];
  if (b64) {
    const decoded = Buffer.from(b64.trim(), "base64").toString("utf8");
    try {
      const parsed = JSON.parse(decoded) as Record<string, unknown>;
      if (parsed && parsed.private_key) return parsed;
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_B64 is not valid base64/JSON");
    }
    throw new Error("GOOGLE_SERVICE_ACCOUNT_B64 has invalid shape");
  }

  const jsonStr = process.env[SERVICE_ACCOUNT_JSON_ENV];
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

export function diagnoseCredentials(): Record<string, unknown> {
  const jsonStr = process.env[SERVICE_ACCOUNT_JSON_ENV] ?? "";
  const b64 = process.env[SERVICE_ACCOUNT_B64_ENV] ?? "";
  let cred: Record<string, unknown> | null = null;
  let parseError = "";
  try {
    cred = getCredentials();
  } catch (e) {
    parseError = String((e as Error).message);
  }
  const key = (cred?.private_key as string) ?? "";
  return {
    b64Set: Boolean(b64),
    jsonSet: Boolean(jsonStr),
    rawLen: jsonStr.length,
    rawHasRealNewline: /[\n\r]/.test(jsonStr.slice(0, 400)),
    rawHasBslashN: jsonStr.slice(0, 400).includes("\\n"),
    parseError,
    credType: (cred?.type as string) ?? null,
    hasClientEmail: Boolean(cred?.client_email),
    pemStarts: key.slice(0, 28),
    pemHasRealNewline: key.includes("\n"),
    pemFragments: key.split("\n").length,
  };
}

export function isDriveConfigured(): boolean {
  return Boolean(
    (process.env[SERVICE_ACCOUNT_B64_ENV] || process.env[SERVICE_ACCOUNT_JSON_ENV]) &&
      process.env.GOOGLE_DRIVE_FOLDER_ID
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
