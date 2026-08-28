import { db } from "@/lib/db";
import { parseCorrectionActions, type CorrectionAction } from "@/lib/discipline";

export type DocData = {
  schoolName: string;
  officeName: string;
  directorName: string;
  directorPosition: string;
  deputyName: string;
  deputyPosition: string;
  advisorName: string;
  today: string;
  studentName: string;
  classroomText: string;
  classroomLevel: string;
  classroomGrade: string;
  classroomRoom: string;
  studentNo: string;
  guardianName: string;
  knownVia: string;
  occurredDate: string;
  occurredTime: string;
  location: string;
  behaviors: { label: string; checked: boolean }[];
  summon: {
    docNo: string;
    meetingDate: string;
    meetingTime: string;
    meetingPlace: string;
  } | null;
  agreement: {
    behaviorDetail: string;
    goodDeedText: string;
    deadline: string;
  } | null;
  correction: {
    actions: CorrectionAction[];
    suggestion: string;
  } | null;
  primaryBehavior: string;
  measureLevel: number;
  directorOpinion: string;
  signatures: { role: string; signerName: string; imageData: string }[];
}

export function signatureOf(
  data: DocData,
  role: string
): { signerName: string; imageData: string } | undefined {
  const sig = data.signatures.find((s) => s.role === role);
  return sig ? { signerName: sig.signerName, imageData: sig.imageData } : undefined;
}

export type DocType = "g1" | "g11" | "g2";

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  g1: "กจ.1",
  g11: "กจ.1.1",
  g2: "กจ.2",
};

export async function loadDocData(
  incidentId: number
): Promise<{ data: DocData; summonExists: boolean; agreementExists: boolean; correctionExists: boolean } | null> {
  const incident = await db.incident.findUnique({
    where: { id: incidentId },
    include: {
      student: true,
      classroom: true,
      behaviors: { include: { behavior: true } },
      summon: true,
      agreement: true,
      correction: true,
      signatures: true,
    },
  });
  if (!incident) return null;

  const settings = await db.setting.findMany();
  const s = Object.fromEntries(settings.map((r) => [r.key, r.value]));

  const allBehaviors = await db.behavior.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  const checkedLabels = new Set(incident.behaviors.map((ib) => ib.behavior.label));

  const thaiDate = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const checkedList = [...checkedLabels];

  const timeFmt = new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const classroomGrade = incident.classroom ? String(incident.classroom.grade) : "";
  const classroomRoom = incident.classroom ? String(incident.classroom.roomNo) : "";

  return {
    summonExists: Boolean(incident.summon),
    agreementExists: Boolean(incident.agreement),
    correctionExists: Boolean(incident.correction),
    data: {
      schoolName: s.schoolName ?? "โรงเรียนบาเจาะ",
      officeName: s.officeName ?? "สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน",
      directorName: s.directorName ?? "",
      directorPosition: s.directorPosition ?? "ผู้อำนวยการโรงเรียน",
      deputyName: s.deputyName ?? "",
      deputyPosition: s.deputyPosition ?? "รองผู้อำนวยการฝ่ายกิจการนักเรียน",
      advisorName: incident.classroom?.advisorName ?? "",
      today: thaiDate.format(new Date()),
      studentName: incident.student.fullName,
      classroomText: incident.classroomText,
      classroomLevel: incident.classroom?.level ?? "ม.",
      classroomGrade,
      classroomRoom,
      studentNo: incident.studentNo,
      guardianName: incident.guardianName,
      knownVia: incident.knownVia,
      occurredDate: thaiDate.format(incident.occurredAt),
      occurredTime: timeFmt.format(incident.occurredAt),
      location: incident.summon?.meetingPlace ?? "",
      behaviors: allBehaviors.map((b) => ({
        label: b.label,
        checked: checkedLabels.has(b.label),
      })),
      summon: incident.summon
        ? {
            docNo: incident.summon.docNo,
            meetingDate: incident.summon.meetingDate
              ? thaiDate.format(incident.summon.meetingDate)
              : "",
            meetingTime: incident.summon.meetingTime,
            meetingPlace: incident.summon.meetingPlace,
          }
        : null,
      agreement: incident.agreement
        ? {
            behaviorDetail: incident.agreement.behaviorDetail,
            goodDeedText: incident.agreement.goodDeedText,
            deadline: incident.agreement.deadline
              ? thaiDate.format(incident.agreement.deadline)
              : "",
          }
        : null,
      correction: incident.correction
        ? {
            actions: parseCorrectionActions(incident.correction.actions).map((a) => ({
              code: a.code,
              deadline:
                a.deadline && !Number.isNaN(new Date(a.deadline).getTime())
                  ? thaiDate.format(new Date(a.deadline))
                  : null,
            })),
            suggestion: incident.correction.suggestion,
          }
        : null,
      primaryBehavior: checkedList[0] ?? "ไม่ระบุ",
      measureLevel: incident.measureLevel,
      directorOpinion: incident.directorOpinion,
      signatures: incident.signatures.map((s) => ({
        role: s.role,
        signerName: s.signerName,
        imageData: s.imageData,
      })),
    },
  };
}
