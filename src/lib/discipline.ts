export const MEASURES = [
  {
    level: 1,
    label: "ว่ากล่าวตักเตือน",
    detail: "พบเจอเป็นครั้งแรก — ว่ากล่าวตักเตือนเป็นลายลักษณ์อักษร",
  },
  {
    level: 2,
    label: "ทำกิจกรรมสาธารณะประโยชน์ + เรียกผู้ปกครอง",
    detail:
      "พบเจอเป็นครั้งที่สอง — ให้ทำกิจกรรมสาธารณะประโยชน์ (การทดแทนความดี) และเรียกผู้ปกครองมารับรู้พฤติกรรม",
  },
  {
    level: 3,
    label: "ทัณฑ์บน",
    detail: "พบเจอเป็นครั้งที่สาม — เชิญผู้ปกครองมาทำทัณฑ์บน",
  },
  {
    level: 4,
    label: "ย้ายสถานศึกษา",
    detail: "ครั้งสุดท้าย — เชิญผู้ปกครองมาเพื่อพิจารณาให้ย้ายสถานศึกษา",
  },
] as const;

export function measureOf(level: number) {
  return MEASURES[Math.min(Math.max(level, 1), MEASURES.length) - 1];
}

export type CorrectionAction = { code: string; deadline: string | null };

export function parseCorrectionActions(json: string): CorrectionAction[] {
  try {
    const arr = JSON.parse(json || "[]") as unknown[];
    return arr
      .map((a) => {
        if (typeof a === "string") return { code: a, deadline: null };
        const obj = a as { code?: unknown; deadline?: unknown };
        return {
          code: String(obj.code ?? ""),
          deadline: obj.deadline ? String(obj.deadline) : null,
        };
      })
      .filter((a) => a.code);
  } catch {
    return [];
  }
}

export const CORRECTION_LABELS: Record<string, string> = {
  advise: "การสอนแนะ",
  gooddeeds: "ให้ทำความดีเพื่อชดใช้ความผิด",
  work: "ให้ช่วยงานตามความสามารถ",
  counsel: "ให้เข้าพบงานปรึกษาแนะแนว",
};

export const SIGNATURE_ROLES = [
  { role: "student", label: "นักเรียน" },
  { role: "parent", label: "ผู้ปกครอง" },
  { role: "patrol", label: "ครูสารวัตร" },
  { role: "director", label: "ผู้อำนวยการ" },
] as const;

export type SignatureRole = (typeof SIGNATURE_ROLES)[number]["role"];

export function isSignatureRole(role: string): role is SignatureRole {
  return SIGNATURE_ROLES.some((r) => r.role === role);
}

export function roleLabel(role: string): string {
  return SIGNATURE_ROLES.find((r) => r.role === role)?.label ?? role;
}
