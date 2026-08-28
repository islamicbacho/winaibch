import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { MONTHS_TH, getReportData, parseFilter } from "@/lib/reports";
import { statusLabel } from "@/components/status-badge";

const HEADER_FONT = { bold: true, size: 12 };

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sp: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    sp[key] = value;
  });
  const filter = parseFilter(sp);
  const data = await getReportData(filter);
  const settings = await db.setting.findMany();
  const s = Object.fromEntries(settings.map((r) => [r.key, r.value]));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "WIN-AIBCH";
  workbook.created = new Date();

  const thDate = new Intl.DateTimeFormat("th-TH", { dateStyle: "short" });

  const caseSheet = workbook.addWorksheet("รายการเคส");
  caseSheet.columns = [
    { header: "วันที่เกิดเหตุ", key: "date", width: 14 },
    { header: "ชื่อ-สกุลนักเรียน", key: "student", width: 28 },
    { header: "ชั้น/เลขที่", key: "classroom", width: 12 },
    { header: "พฤติกรรม", key: "behaviors", width: 40 },
    { header: "วิธีทราบ", key: "knownVia", width: 18 },
    { header: "ผู้ปกครอง", key: "guardian", width: 24 },
    { header: "สถานะ", key: "status", width: 20 },
    { header: "รายละเอียด", key: "description", width: 50 },
  ];
  for (const incident of data.incidents) {
    caseSheet.addRow({
      date: thDate.format(incident.occurredAt),
      student: incident.student.fullName,
      classroom: `${incident.classroomText}${incident.studentNo ? `/${incident.studentNo}` : ""}`,
      behaviors: incident.behaviors.map((ib) => ib.behavior.label).join(", "),
      knownVia: incident.knownVia,
      guardian: incident.guardianName,
      status: statusLabel(incident.status),
      description: incident.description,
    });
  }
  caseSheet.getRow(1).font = HEADER_FONT;

  const classSheet = workbook.addWorksheet("สรุปตามห้องเรียน");
  classSheet.columns = [
    { header: "ห้องเรียน", key: "label", width: 16 },
    { header: "จำนวนเคส", key: "count", width: 12 },
  ];
  for (const [label, count] of data.byClass) {
    classSheet.addRow({ label, count });
  }
  classSheet.getRow(1).font = HEADER_FONT;

  const behaviorSheet = workbook.addWorksheet("สรุปตามพฤติกรรม");
  behaviorSheet.columns = [
    { header: "พฤติกรรม", key: "label", width: 40 },
    { header: "จำนวนครั้ง", key: "count", width: 12 },
  ];
  for (const [label, count] of data.byBehavior) {
    behaviorSheet.addRow({ label, count });
  }
  behaviorSheet.getRow(1).font = HEADER_FONT;

  const summarySheet = workbook.addWorksheet("สรุปภาพรวม");
  summarySheet.columns = [
    { header: "รายงานเดือน", key: "k", width: 22 },
    { header: "จำนวน", key: "v", width: 12 },
  ];
  summarySheet.addRow({ k: `เดือน${MONTHS_TH[filter.month - 1]} พ.ศ. ${filter.yearTh}`, v: "" });
  summarySheet.addRow({ k: "โรงเรียน", v: s.schoolName ?? "" });
  summarySheet.addRow({ k: "เคสทั้งหมด", v: data.total });
  summarySheet.addRow({ k: "ปิดเคสแล้ว", v: data.closed });
  summarySheet.addRow({ k: "ยังไม่ปิด", v: data.open });
  summarySheet.addRow({ k: "จัดทำโดย", v: session.name });
  summarySheet.getRow(1).font = HEADER_FONT;

  const buffer = await workbook.xlsx.writeBuffer();

  const filename = `report-${filter.yearTh}-${String(filter.month).padStart(2, "0")}.xlsx`;
  return new Response(Buffer.from(buffer as ArrayBuffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
