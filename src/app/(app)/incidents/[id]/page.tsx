import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import StatusBadge from "@/components/status-badge";
import { ActionForm, SubmitButton } from "@/components/action-form";
import SignatureCard from "@/components/signature-card";
import CorrectionActionsPicker from "@/components/correction-actions-picker";
import {
  CORRECTION_LABELS,
  SIGNATURE_ROLES,
  measureOf,
  parseCorrectionActions,
} from "@/lib/discipline";
import {
  closeIncident,
  createAgreement,
  createCorrection,
  createSummon,
  deleteIncident,
  skipToCorrection,
} from "@/app/actions/incidents";

const STEPS = [
  { key: "recorded", label: "บันทึกเหตุ" },
  { key: "summoned", label: "กจ.1 เชิญผู้ปกครอง" },
  { key: "agreement", label: "กจ.1.1 ข้อตกลง" },
  { key: "corrective", label: "กจ.2 แก้ไข" },
  { key: "signing", label: "ลงนามอิเล็กทรอนิกส์" },
  { key: "closed", label: "ปิดเคส" },
];

const input =
  "w-full rounded border border-line bg-night px-3 py-2 text-sm text-white placeholder:text-steel/50 focus:border-signal focus:outline-none";
const labelClass =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-steel";

function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function SummaryCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border border-mint/30 bg-mint/5 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-mint">{title}</p>
      <div className="mt-2 space-y-1 text-sm text-white/90">{children}</div>
    </div>
  );
}

export default async function IncidentDetailPage({
  params,
}: PageProps<"/incidents/[id]">) {
  const { id } = await params;
  const incidentId = Number(id);
  if (!Number.isInteger(incidentId) || incidentId <= 0) notFound();

  const incident = await db.incident.findUnique({
    where: { id: incidentId },
    include: {
      student: true,
      classroom: true,
      behaviors: { include: { behavior: true } },
      summon: true,
      agreement: true,
      correction: true,
      recordedBy: true,
      signatures: true,
    },
  });
  if (!incident) notFound();

  const measure = measureOf(incident.measureLevel);
  const signedRoles = new Set(incident.signatures.map((sig) => sig.role));
  const missingSigs = SIGNATURE_ROLES.filter((r) => !signedRoles.has(r.role));

  const settings = await db.setting.findMany();
  const s = Object.fromEntries(settings.map((r) => [r.key, r.value]));
  const nextDocNo = `${(Number(s.docCounter ?? "0") || 0) + 1}/${s.academicYear ?? ""}`;

  const stepStatus =
    incident.status === "corrective" ? "signing" : incident.status;
  const currentIdx = STEPS.findIndex((step) => step.key === stepStatus);
  const behaviorLabels = incident.behaviors
    .map((ib) => ib.behavior.label)
    .join(", ");

  const fullDateFmt = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "full",
    timeStyle: "short",
  });
  const dateFmt = new Intl.DateTimeFormat("th-TH", { dateStyle: "long" });

  const defaultMeeting = new Date();
  defaultMeeting.setDate(defaultMeeting.getDate() + 7);

  const correctionActions = incident.correction
    ? parseCorrectionActions(incident.correction.actions)
    : [];
  const thDateLong = new Intl.DateTimeFormat("th-TH", { dateStyle: "long" });

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/incidents" className="text-xs font-semibold text-steel hover:text-signal">
        ← กลับรายการเคส
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            {incident.student.fullName}
            <span className="ml-2 text-base font-medium text-steel">
              {incident.classroomText}
              {incident.studentNo ? ` • เลขประจำตัว ${incident.studentNo}` : ""}
            </span>
          </h1>
          <p className="mt-1 text-sm text-steel">
            {fullDateFmt.format(incident.occurredAt)} • บันทึกโดย{" "}
            {incident.recordedBy?.name ?? "-"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={incident.status} />
          <ActionForm
            action={deleteIncident}
            confirm={`ลบเคสของ ${incident.student.fullName} ถาวร? ข้อมูล กจ.1/กจ.1.1/กจ.2 และลายเซ็นทั้งหมดจะถูกลบ`}
          >
            <input type="hidden" name="incidentId" value={incident.id} />
            <button
              type="submit"
              className="rounded border border-alert/50 bg-alert/10 px-3 py-1.5 text-xs font-bold text-alert transition hover:bg-alert/20"
            >
              ลบเคสนี้
            </button>
          </ActionForm>
        </div>
      </div>

      <div className="clip-corner mt-4 flex flex-wrap items-center gap-4 border border-signal/40 bg-signal/10 p-4">
        <span className="clip-corner bg-signal px-3 py-1.5 text-xs font-extrabold text-night">
          มาตรการครั้งที่ {incident.measureLevel}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-signal">{measure.label}</p>
          <p className="text-xs text-steel">{measure.detail}</p>
        </div>
      </div>

      <div className="clip-corner mt-6 border border-line bg-panel">
        <div className="hazard h-1" />
        <div className="p-6">
          <h2 className="text-base font-bold text-white">ข้อมูลเหตุการณ์</h2>
          <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
            <div>
              <p className={labelClass}>พฤติกรรมที่กระทำผิด</p>
              <div className="flex flex-wrap gap-1.5">
                {incident.behaviors.map((ib) => (
                  <span
                    key={ib.behaviorId}
                    className="rounded-full border border-signal/40 bg-signal/10 px-3 py-1 text-xs font-medium text-signal"
                  >
                    {ib.behavior.label}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className={labelClass}>ทราบเหตุการณ์ได้อย่างไร</p>
              <p className="text-white/90">{incident.knownVia || "-"}</p>
            </div>
            <div>
              <p className={labelClass}>ผู้ปกครอง</p>
              <p className="text-white/90">
                {incident.guardianName || "-"}
                {incident.guardianPhone ? ` • ${incident.guardianPhone}` : ""}
              </p>
            </div>
            <div>
              <p className={labelClass}>รายละเอียดเหตุการณ์</p>
              <p className="whitespace-pre-wrap text-white/90">
                {incident.description || "-"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-1.5 overflow-x-auto pb-2">
        {STEPS.map((step, idx) => {
          const done = idx < currentIdx;
          const active = idx === currentIdx;
          const skipped =
            incident.measureLevel === 1 &&
            done &&
            (step.key === "summoned" || step.key === "agreement");
          return (
            <div key={step.key} className="flex min-w-0 flex-1 items-center gap-1.5">
              <div
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 whitespace-nowrap text-xs font-semibold ${
                  skipped
                    ? "border-line bg-panel-2 text-steel line-through"
                    : done
                      ? "border-mint/50 bg-mint/10 text-mint"
                      : active
                        ? "border-signal bg-signal text-night"
                        : "border-line text-steel"
                }`}
              >
                <span>{skipped ? "↷" : done ? "✓" : idx + 1}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`h-px flex-1 ${done ? "bg-mint/50" : "bg-line"}`} />
              )}
            </div>
          );
        })}
      </div>

      {(incident.summon || incident.agreement || incident.correction) && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-steel">
            เอกสารพร้อมพิมพ์:
          </span>
          {incident.summon && (
            <Link
              href={`/print/g1/${incident.id}?autoprint=1`}
              target="_blank"
              className="rounded border border-signal/60 bg-signal/10 px-4 py-2 text-sm font-semibold text-signal transition hover:bg-signal/20"
            >
              พิมพ์ กจ.1
            </Link>
          )}
          {incident.agreement && (
            <Link
              href={`/print/g11/${incident.id}?autoprint=1`}
              target="_blank"
              className="rounded border border-signal/60 bg-signal/10 px-4 py-2 text-sm font-semibold text-signal transition hover:bg-signal/20"
            >
              พิมพ์ กจ.1.1
            </Link>
          )}
          {incident.correction && (
            <Link
              href={`/print/g2/${incident.id}?autoprint=1`}
              target="_blank"
              className="rounded border border-signal/60 bg-signal/10 px-4 py-2 text-sm font-semibold text-signal transition hover:bg-signal/20"
            >
              พิมพ์ กจ.2
            </Link>
          )}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {incident.summon && (
          <SummaryCard title={`กจ.1 บันทึกความ (เชิญผู้ปกครอง) • เลขที่ ${incident.summon.docNo}`}>
            <p>
              นัดผู้ปกครอง: {dateFmt.format(incident.summon.meetingDate!)}
              {incident.summon.meetingTime ? ` เวลา ${incident.summon.meetingTime} น.` : ""}
            </p>
            <p>สถานที่: {incident.summon.meetingPlace || "-"}</p>
          </SummaryCard>
        )}

        {incident.agreement && (
          <SummaryCard title="กจ.1.1 ข้อตกลงการฝึกความประพฤติ">
            <p>ความดีทดแทน: {incident.agreement.goodDeedText}</p>
            {incident.agreement.deadline && (
              <p>กำหนดภายใน: {dateFmt.format(incident.agreement.deadline)}</p>
            )}
          </SummaryCard>
        )}

        {incident.correction && (
          <SummaryCard title="กจ.2 การแก้ไขความประพฤติ">
            <ul className="list-inside list-disc">
              {correctionActions.map((a) => (
                <li key={a.code}>
                  {CORRECTION_LABELS[a.code] ?? a.code}
                  {a.deadline
                    ? ` — ภายใน ${thDateLong.format(new Date(a.deadline))}`
                    : ""}
                </li>
              ))}
            </ul>
            {incident.correction.suggestion && (
              <p>ข้อเสนอแนะ: {incident.correction.suggestion}</p>
            )}
            {incident.directorOpinion && (
              <p>ความเห็นผู้อำนวยการ: {incident.directorOpinion}</p>
            )}
          </SummaryCard>
        )}

        {incident.status === "recorded" && incident.measureLevel === 1 && (
          <div className="clip-corner border border-line bg-panel">
            <div className="hazard h-1" />
            <div className="p-6">
              <h2 className="text-base font-bold text-white">
                มาตรการครั้งที่ 1: ว่ากล่าวตักเตือน
              </h2>
              <p className="mt-1 text-sm text-steel">
                ครั้งแรกเป็นการว่ากล่าวตักเตือน — ไม่จำเป็นต้องนัดผู้ปกครองมาประชุมรับทราบ
                ข้ามไปบันทึก กจ.2 (การแก้ไขความประพฤติ + ความเห็นผู้อำนวยการ) ได้เลย
              </p>
              <ActionForm action={skipToCorrection} className="mt-4">
                <input type="hidden" name="incidentId" value={incident.id} />
                <SubmitButton
                  className="clip-corner bg-signal px-6 py-2.5 text-sm font-bold text-night transition hover:brightness-110 disabled:opacity-60"
                  pendingText="กำลังดำเนินการ..."
                >
                  ข้ามไปขั้น กจ.2 (ไม่นัดผู้ปกครอง)
                </SubmitButton>
              </ActionForm>
            </div>
          </div>
        )}

        {incident.status === "recorded" && incident.measureLevel > 1 && (
          <div className="clip-corner border border-line bg-panel">
            <div className="hazard h-1" />
            <div className="p-6">
              <h2 className="text-base font-bold text-white">
                ขั้นตอนถัดไป: ออก กจ.1 — บันทึกความเชิญผู้ปกครอง
              </h2>
              <p className="mt-1 text-xs text-steel">
                เลขที่หนังสือที่จะได้รับ: {nextDocNo} (ระบบรันเลขอัตโนมัติ)
              </p>
              <ActionForm action={createSummon} className="mt-5 space-y-4">
                <input type="hidden" name="incidentId" value={incident.id} />
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className={labelClass} htmlFor="meetingDate">
                      วันที่นัดผู้ปกครอง *
                    </label>
                    <input
                      id="meetingDate"
                      name="meetingDate"
                      type="date"
                      required
                      defaultValue={toDateInput(defaultMeeting)}
                      className={input}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="meetingTime">
                      เวลา
                    </label>
                    <input
                      id="meetingTime"
                      name="meetingTime"
                      type="time"
                      defaultValue="09:00"
                      className={input}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="meetingPlace">
                      สถานที่
                    </label>
                    <input
                      id="meetingPlace"
                      name="meetingPlace"
                      type="text"
                      defaultValue="ห้องผู้อำนวยการโรงเรียนบาเจาะ"
                      className={input}
                    />
                  </div>
                </div>
                <SubmitButton
                  className="clip-corner bg-signal px-6 py-2.5 text-sm font-bold text-night transition hover:brightness-110 disabled:opacity-60"
                  pendingText="กำลังบันทึก..."
                >
                  ยืนยันออก กจ.1
                </SubmitButton>
              </ActionForm>
            </div>
          </div>
        )}

        {incident.status === "summoned" && (
          <div className="clip-corner border border-line bg-panel">
            <div className="hazard h-1" />
            <div className="p-6">
              <h2 className="text-base font-bold text-white">
                ขั้นตอนถัดไป: ทำ กจ.1.1 — ข้อตกลงการฝึกความประพฤติเรียนรู้
              </h2>
              <ActionForm action={createAgreement} className="mt-5 space-y-4">
                <input type="hidden" name="incidentId" value={incident.id} />
                <div>
                  <label className={labelClass} htmlFor="behaviorDetail">
                    พฤติกรรมที่เป็นเหตุ (ตามเอกสาร)
                  </label>
                  <textarea
                    id="behaviorDetail"
                    name="behaviorDetail"
                    rows={2}
                    defaultValue={behaviorLabels}
                    className={input}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="goodDeedText">
                    ความดีที่กำหนดให้ทำเพื่อชดใช้ความผิด *
                  </label>
                  <textarea
                    id="goodDeedText"
                    name="goodDeedText"
                    rows={3}
                    required
                    placeholder="เช่น ทำงานอาสาดูแลความสะอาดหน้าเสาธง 1 สัปดาห์"
                    className={input}
                  />
                </div>
                <div className="max-w-xs">
                  <label className={labelClass} htmlFor="deadline">
                    กำหนดเสร็จภายใน
                  </label>
                  <input
                    id="deadline"
                    name="deadline"
                    type="date"
                    defaultValue={toDateInput(defaultMeeting)}
                    className={input}
                  />
                </div>
                <SubmitButton
                  className="clip-corner bg-signal px-6 py-2.5 text-sm font-bold text-night transition hover:brightness-110 disabled:opacity-60"
                  pendingText="กำลังบันทึก..."
                >
                  ยืนยันทำข้อตกลง กจ.1.1
                </SubmitButton>
              </ActionForm>
            </div>
          </div>
        )}

        {incident.status === "agreement" && (
          <div className="clip-corner border border-line bg-panel">
            <div className="hazard h-1" />
            <div className="p-6">
              <h2 className="text-base font-bold text-white">
                ขั้นตอนถัดไป: บันทึก กจ.2 — การดำเนินการแก้ไขความประพฤติ
              </h2>
              <ActionForm action={createCorrection} className="mt-5 space-y-4">
                <input type="hidden" name="incidentId" value={incident.id} />
                <CorrectionActionsPicker defaultDate={toDateInput(defaultMeeting)} />
                <div>
                  <label className={labelClass} htmlFor="directorOpinion">
                    ความเห็นของผู้อำนวยการสถานศึกษา *
                  </label>
                  <textarea
                    id="directorOpinion"
                    name="directorOpinion"
                    rows={2}
                    required
                    placeholder="ความเห็นและคำสั่งของผู้อำนวยการที่มีต่อเคสนี้"
                    className={input}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="suggestion">
                    ข้อเสนอแนะเพื่อปรับปรุงแก้ไข
                  </label>
                  <textarea
                    id="suggestion"
                    name="suggestion"
                    rows={3}
                    placeholder="แนวทางติดตามและปรับปรุงพฤติกรรมของนักเรียน"
                    className={input}
                  />
                </div>
                <SubmitButton
                  className="clip-corner bg-signal px-6 py-2.5 text-sm font-bold text-night transition hover:brightness-110 disabled:opacity-60"
                  pendingText="กำลังบันทึก..."
                >
                  ยืนยันบันทึก กจ.2
                </SubmitButton>
              </ActionForm>
            </div>
          </div>
        )}

        {(incident.status === "signing" || incident.status === "corrective") && (
          <div className="clip-corner border border-line bg-panel">
            <div className="hazard h-1" />
            <div className="p-6">
              <h2 className="text-base font-bold text-white">
                ขั้นตอน: ลงนามอิเล็กทรอนิกส์{" "}
                <span className="text-xs font-medium text-steel">
                  (ครบทั้ง 4 ฝ่ายจึงจะปิดเคสได้)
                </span>
              </h2>
              <p className="mt-1 text-xs text-steel">
                ให้บุคคลที่เกี่ยวข้องเซ็นชื่อในช่อง — ลายเซ็นจะปรากฏในเอกสารพิมพ์และ PDF
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {SIGNATURE_ROLES.map((r) => (
                  <SignatureCard
                    key={r.role}
                    incidentId={incident.id}
                    role={r.role}
                    label={r.label}
                    existing={incident.signatures.find((s) => s.role === r.role)}
                  />
                ))}
              </div>

              <div className="mt-6 border-t border-line pt-5">
                <h3 className="text-sm font-bold text-white">เสร็จแล้ว: ปิดเคส</h3>
                {missingSigs.length > 0 ? (
                  <p className="mt-2 rounded border border-alert/40 bg-alert/10 px-4 py-2.5 text-sm font-medium text-alert">
                    ยังปิดเคสไม่ได้ — ต้องลงนามครบ 4 ฝ่ายก่อน (ขาด:{" "}
                    {missingSigs.map((r) => r.label).join(", ")})
                  </p>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-mint">
                      ลงนามครบ 4 ฝ่ายแล้ว — กดปิดเคสเพื่อสิ้นสุดการดำเนินการ
                    </p>
                    <ActionForm
                      action={closeIncident}
                      confirm="ยืนยันปิดเคสนี้? การปิดเคสเป็นขั้นตอนสุดท้าย"
                      className="mt-4"
                    >
                      <input type="hidden" name="incidentId" value={incident.id} />
                      <SubmitButton
                        className="clip-corner bg-mint px-6 py-2.5 text-sm font-bold text-night transition hover:brightness-110 disabled:opacity-60"
                        pendingText="กำลังปิดเคส..."
                      >
                        ปิดเคส
                      </SubmitButton>
                    </ActionForm>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {incident.status === "closed" && (
          <div className="clip-corner border border-mint/40 bg-mint/10 p-6 text-center">
            <p className="text-base font-bold text-mint">เคสนี้ปิดสมบูรณ์แล้ว ✓</p>
            <p className="mt-1 text-xs text-steel">
              ผู้ลงนาม:{" "}
              {SIGNATURE_ROLES.map((r) => {
                const sig = incident.signatures.find((x) => x.role === r.role);
                return sig ? `${r.label} (${sig.signerName})` : r.label;
              }).join(" • ")}
            </p>
            <p className="mt-1 text-xs text-steel">
              เอกสาร กจ.1 / กจ.1.1 / กจ.2 พร้อมพิมพ์และบันทึก PDF ด้านบน
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
