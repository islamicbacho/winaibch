import { google } from "googleapis";
import { Readable } from "node:stream";

const SERVICE_ACCOUNT_B64_ENV = "GOOGLE_SERVICE_ACCOUNT_B64";
const SERVICE_ACCOUNT_JSON_ENV = "GOOGLE_SERVICE_ACCOUNT_JSON";
const OAUTH_CLIENT_ID_ENV = "GOOGLE_OAUTH_CLIENT_ID";
const OAUTH_CLIENT_SECRET_ENV = "GOOGLE_OAUTH_CLIENT_SECRET";
const OAUTH_REFRESH_TOKEN_ENV = "GOOGLE_OAUTH_REFRESH_TOKEN";

function hasOAuthCredentials(): boolean {
  return Boolean(
    process.env[OAUTH_CLIENT_ID_ENV] &&
      process.env[OAUTH_CLIENT_SECRET_ENV] &&
      process.env[OAUTH_REFRESH_TOKEN_ENV]
  );
}

export function getCredentials(): Record<string, unknown> {
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
  } catch {
    // leave null when service account is not the active config
  }
  const key = (cred?.private_key as string) ?? "";
  return {
    oauth: hasOAuthCredentials(),
    oauthClientId: process.env[OAUTH_CLIENT_ID_ENV] ?? null,
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID ?? null,
    b64Set: Boolean(b64),
    jsonSet: Boolean(jsonStr),
    rawLen: jsonStr.length,
    parseError,
    credType: (cred?.type as string) ?? null,
    hasClientEmail: Boolean(cred?.client_email),
    pemHasRealNewline: key.includes("\n"),
    pemFragments: key.split("\n").length,
  };
}

export function isDriveConfigured(): boolean {
  if (!process.env.GOOGLE_DRIVE_FOLDER_ID) return false;
  return hasOAuthCredentials() || Boolean(
    process.env[SERVICE_ACCOUNT_B64_ENV] || process.env[SERVICE_ACCOUNT_JSON_ENV]
  );
}

export async function uploadToDrive(
  buffer: Buffer,
  filename: string,
  folderId?: string
): Promise<{ id: string; webViewLink: string }> {
  return uploadFileToDrive(buffer, filename, {
    mimeType: "application/pdf",
    folderId,
  });
}

export async function uploadFileToDrive(
  buffer: Buffer,
  filename: string,
  options: { mimeType?: string; folderId?: string } = {}
): Promise<{ id: string; webViewLink: string }> {
  const folderId = options.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID!;
  const mimeType = options.mimeType || "application/pdf";

  const auth = createDriveAuth();
  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
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

function sanitize(input: string): string {
  return input.replace(/[\\/:*?"<>|]/g, "-").trim();
}

export async function getOrCreateDriveFolderPath(input: {
  name: string;
  parents?: string[];
}): Promise<string> {
  const parentIds = input.parents?.length ? input.parents : [];
  if (!parentIds.length) {
    const rootId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!rootId) throw new Error("GOOGLE_DRIVE_FOLDER_ID not set");
    parentIds.push(rootId);
  }

  const auth = createDriveAuth();
  const drive = google.drive({ version: "v3", auth });

  const query =
    `name = ${JSON.stringify(input.name)} and mimeType = 'application/vnd.google-apps.folder'` +
    ` and (${parentIds
      .map((parent) => `'${parent}' in parents`)
      .join(" or ")}) and trashed = false`;
  const list = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    pageSize: 10,
    spaces: "drive",
  });

  const existing = list.data.files?.[0];
  if (existing?.id) return existing.id;

  const created = await drive.files.create({
    requestBody: {
      name: input.name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentIds,
    },
    fields: "id",
  });
  if (!created.data.id) throw new Error(`create folder failed: ${input.name}`);
  return created.data.id;
}

type FolderContext = {
  category: string;
  title: string;
  description: string;
};

export async function getStudentDriveFolder(ctx: FolderContext): Promise<string> {
  const categoryId = await getOrCreateDriveFolderPath({ name: ctx.category });
  const studentFolder = `${ctx.title} (${ctx.description})`;
  return getOrCreateDriveFolderPath({
    name: studentFolder,
    parents: [categoryId],
  });
}

function createDriveAuth() {
  const clientId = process.env[OAUTH_CLIENT_ID_ENV];
  if (clientId && hasOAuthCredentials()) {
    const oauth = new google.auth.OAuth2({
      clientId,
      clientSecret: process.env[OAUTH_CLIENT_SECRET_ENV],
      redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || "http://127.0.0.1:8080/oauth2callback",
    });
    oauth.setCredentials({ refresh_token: process.env[OAUTH_REFRESH_TOKEN_ENV] });
    return oauth;
  }
  return new google.auth.GoogleAuth({
    credentials: getCredentials(),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}
