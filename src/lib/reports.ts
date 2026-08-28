import { db } from "@/lib/db";

export type ReportFilter = {
  month: number;
  yearTh: number;
  classId: number | null;
};

export const MONTHS_TH = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export function parseFilter(sp: Record<string, string | string[] | undefined>): ReportFilter {
  const now = new Date();
  const defaultMonth = now.getMonth() + 1;
  const defaultYearTh = now.getFullYear() + 543;

  const month = Number(sp.month);
  const yearTh = Number(sp.year);
  const classId = Number(sp.classId);

  return {
    month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : defaultMonth,
    yearTh: Number.isInteger(yearTh) && yearTh >= 2500 && yearTh <= 2700 ? yearTh : defaultYearTh,
    classId: Number.isInteger(classId) && classId > 0 ? classId : null,
  };
}

export async function getReportData(filter: ReportFilter) {
  const start = new Date(filter.yearTh - 543, filter.month - 1, 1);
  const end = new Date(filter.yearTh - 543, filter.month, 1);

  const incidents = await db.incident.findMany({
    where: {
      occurredAt: { gte: start, lt: end },
      ...(filter.classId ? { classroomId: filter.classId } : {}),
    },
    include: {
      student: true,
      classroom: true,
      behaviors: { include: { behavior: true } },
    },
    orderBy: { occurredAt: "asc" },
  });

  const byClass = new Map<string, number>();
  const byBehavior = new Map<string, number>();
  let closed = 0;

  for (const incident of incidents) {
    const classLabel = incident.classroom
      ? `${incident.classroom.level}${incident.classroom.grade}/${incident.classroom.roomNo}`
      : "ไม่ระบุ";
    byClass.set(classLabel, (byClass.get(classLabel) ?? 0) + 1);
    for (const ib of incident.behaviors) {
      byBehavior.set(ib.behavior.label, (byBehavior.get(ib.behavior.label) ?? 0) + 1);
    }
    if (incident.status === "closed") closed += 1;
  }

  return {
    filter,
    incidents,
    total: incidents.length,
    closed,
    open: incidents.length - closed,
    byClass: [...byClass.entries()].sort((a, b) => b[1] - a[1]),
    byBehavior: [...byBehavior.entries()].sort((a, b) => b[1] - a[1]),
  };
}

export type ReportData = Awaited<ReturnType<typeof getReportData>>;
