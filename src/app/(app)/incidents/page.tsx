import Link from "next/link";
import { db } from "@/lib/db";
import { ActionForm } from "@/components/action-form";
import StatusBadge, { statusLabel } from "@/components/status-badge";
import { deleteIncident } from "@/app/actions/incidents";

export const metadata = { title: "รายการเคส" };

const input =
  "rounded border border-line bg-night px-3 py-2 text-sm text-white placeholder:text-steel/50 focus:border-signal focus:outline-none";

const STATUSES = ["recorded", "summoned", "agreement", "corrective", "signing", "closed"];

export default async function IncidentsPage(props: PageProps<"/incidents">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const classId = typeof sp.classId === "string" ? Number(sp.classId) : 0;

  const where = {
    ...(q ? { student: { fullName: { contains: q } } } : {}),
    ...(STATUSES.includes(status) ? { status } : {}),
    ...(Number.isInteger(classId) && classId > 0 ? { classroomId: classId } : {}),
  };

  const [incidents, classrooms] = await Promise.all([
    db.incident.findMany({
      where,
      include: {
        student: true,
        behaviors: { include: { behavior: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 200,
    }),
    db.classroom.findMany({
      orderBy: [{ level: "asc" }, { grade: "asc" }, { roomNo: "asc" }],
    }),
  ]);

  const dateFmt = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold italic tracking-tight text-white">
            รายการเคส<span className="text-signal">.</span>
          </h1>
          <p className="mt-1 text-sm text-steel">ทั้งหมด {incidents.length} เคส</p>
        </div>
        <Link
          href="/incidents/new"
          className="clip-corner bg-signal px-5 py-2.5 text-sm font-bold text-night transition hover:brightness-110"
        >
          + บันทึกเหตุการณ์ใหม่
        </Link>
      </div>

      <form className="mt-6 flex flex-wrap items-center gap-3" action="/incidents" method="get">
        <input
          name="q"
          type="text"
          defaultValue={q}
          placeholder="ค้นหาชื่อนักเรียน..."
          className={`${input} min-w-56`}
        />
        <select name="status" defaultValue={status} className={input}>
          <option value="">ทุกสถานะ</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
        <select name="classId" defaultValue={classId || ""} className={input}>
          <option value="">ทุกห้องเรียน</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.level}
              {c.grade}/{c.roomNo}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded border border-signal/60 bg-signal/10 px-4 py-2 text-sm font-semibold text-signal transition hover:bg-signal/20"
        >
          กรอง
        </button>
        {(q || status || classId) && (
          <Link href="/incidents" className="text-xs text-steel hover:text-white">
            ล้างตัวกรอง
          </Link>
        )}
      </form>

      {incidents.length === 0 ? (
        <div className="clip-corner mt-8 border border-line bg-panel p-14 text-center">
          <p className="text-sm text-steel">ไม่พบเคสตามเงื่อนไข — บันทึกเหตุการณ์ใหม่ได้ที่ปุ่มด้านบน</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded border border-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-panel-2 text-xs uppercase tracking-wider text-steel">
                <th className="px-4 py-3 font-semibold">วันที่เกิดเหตุ</th>
                <th className="px-4 py-3 font-semibold">นักเรียน</th>
                <th className="px-4 py-3 font-semibold">ชั้น/เลขประจำตัว</th>
                <th className="px-4 py-3 font-semibold">พฤติกรรม</th>
                <th className="px-4 py-3 font-semibold">สถานะ</th>
                <th className="px-4 py-3 text-right font-semibold">ลบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {incidents.map((incident) => (
                <tr key={incident.id} className="bg-panel transition-colors hover:bg-panel-2">
                  <td className="whitespace-nowrap px-4 py-3 text-steel">
                    <Link href={`/incidents/${incident.id}`} className="hover:text-signal">
                      {dateFmt.format(incident.occurredAt)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">
                    <Link href={`/incidents/${incident.id}`} className="hover:text-signal">
                      {incident.student.fullName}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-steel">
                    {incident.classroomText}
                    {incident.studentNo ? ` • ${incident.studentNo}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {incident.behaviors.slice(0, 2).map((ib) => (
                        <span
                          key={ib.behaviorId}
                          className="rounded-full border border-line px-2.5 py-0.5 text-xs text-steel"
                        >
                          {ib.behavior.label}
                        </span>
                      ))}
                      {incident.behaviors.length > 2 && (
                        <span className="rounded-full border border-signal/40 px-2.5 py-0.5 text-xs text-signal">
                          +{incident.behaviors.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={incident.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ActionForm
                      action={deleteIncident}
                      confirm={`ลบเคสของ ${incident.student.fullName} ถาวร? ข้อมูลและลายเซ็นทั้งหมดจะถูกลบ`}
                    >
                      <input type="hidden" name="incidentId" value={incident.id} />
                      <button
                        type="submit"
                        className="rounded border border-alert/40 px-2.5 py-1 text-xs font-semibold text-alert transition hover:bg-alert/10"
                      >
                        ลบ
                      </button>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
