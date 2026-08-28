import Link from "next/link";
import { db } from "@/lib/db";
import StatusBadge from "@/components/status-badge";
import { MONTHS_TH, getReportData, parseFilter } from "@/lib/reports";

export const metadata = { title: "รายงาน" };

const input =
  "rounded border border-line bg-night px-3 py-2 text-sm text-white placeholder:text-steel/50 focus:border-signal focus:outline-none";

export default async function ReportsPage({
  searchParams,
}: PageProps<"/reports">) {
  const sp = await searchParams;
  const filter = parseFilter(sp as Record<string, string | string[] | undefined>);
  const [data, classrooms] = await Promise.all([
    getReportData(filter),
    db.classroom.findMany({
      orderBy: [{ level: "asc" }, { grade: "asc" }, { roomNo: "asc" }],
    }),
  ]);

  const maxBehavior = data.byBehavior[0]?.[1] ?? 0;
  const maxClass = data.byClass[0]?.[1] ?? 0;

  const exportParams = new URLSearchParams({
    month: String(filter.month),
    year: String(filter.yearTh),
    ...(filter.classId ? { classId: String(filter.classId) } : {}),
  });

  const dateFmt = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold italic tracking-tight text-white">
            รายงาน<span className="text-signal">.</span>
          </h1>
          <p className="mt-1 text-sm text-steel">
            เดือน{MONTHS_TH[filter.month - 1]} พ.ศ. {filter.yearTh}
            {filter.classId ? " (เฉพาะห้องที่เลือก)" : ""}
          </p>
        </div>
        <a
          href={`/api/reports/export?${exportParams.toString()}`}
          className="clip-corner bg-signal px-5 py-2.5 text-sm font-bold text-night transition hover:brightness-110"
        >
          ⬇ ดาวน์โหลด Excel
        </a>
      </div>

      <form
        className="mt-6 flex flex-wrap items-center gap-3"
        action="/reports"
        method="get"
      >
        <select name="month" defaultValue={filter.month} className={input}>
          {MONTHS_TH.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <input
          name="year"
          type="number"
          min={2500}
          max={2700}
          defaultValue={filter.yearTh}
          className={`${input} w-28`}
        />
        <select name="classId" defaultValue={filter.classId ?? ""} className={input}>
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
          แสดงรายงาน
        </button>
      </form>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          { label: "เคสในเดือนนี้", value: data.total, tone: "text-white" },
          { label: "ปิดเคสแล้ว", value: data.closed, tone: "text-mint" },
          { label: "ยังไม่ปิด", value: data.open, tone: "text-alert" },
        ].map((s) => (
          <div key={s.label} className="clip-corner border border-line bg-panel">
            <div className="hazard h-1" />
            <div className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-steel">
                {s.label}
              </p>
              <p className={`mt-2 text-3xl font-extrabold tabular-nums ${s.tone}`}>
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="clip-corner border border-line bg-panel p-6">
          <h2 className="text-base font-bold text-white">ตามพฤติกรรม</h2>
          <div className="mt-4 space-y-2.5">
            {data.byBehavior.length === 0 ? (
              <p className="text-sm text-steel">ไม่มีข้อมูลในช่วงเวลานี้</p>
            ) : (
              data.byBehavior.map(([label, count]) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 truncate text-sm text-steel" title={label}>
                    {label}
                  </span>
                  <div className="h-5 flex-1 overflow-hidden rounded-sm bg-night">
                    <div
                      className="h-full bg-signal"
                      style={{ width: `${maxBehavior ? Math.round((count / maxBehavior) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-bold tabular-nums text-white">
                    {count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="clip-corner border border-line bg-panel p-6">
          <h2 className="text-base font-bold text-white">ตามห้องเรียน</h2>
          <div className="mt-4 space-y-2.5">
            {data.byClass.length === 0 ? (
              <p className="text-sm text-steel">ไม่มีข้อมูลในช่วงเวลานี้</p>
            ) : (
              data.byClass.map(([label, count]) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 truncate text-sm text-steel">{label}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded-sm bg-night">
                    <div
                      className="h-full bg-sky-400"
                      style={{ width: `${maxClass ? Math.round((count / maxClass) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-bold tabular-nums text-white">
                    {count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded border border-line">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-panel-2 text-xs uppercase tracking-wider text-steel">
              <th className="px-4 py-3 font-semibold">วันที่</th>
              <th className="px-4 py-3 font-semibold">นักเรียน</th>
              <th className="px-4 py-3 font-semibold">ชั้น</th>
              <th className="px-4 py-3 font-semibold">พฤติกรรม</th>
              <th className="px-4 py-3 font-semibold">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.incidents.length === 0 ? (
              <tr>
                <td colSpan={5} className="bg-panel px-4 py-10 text-center text-steel">
                  ไม่มีเคสในช่วงเวลานี้
                </td>
              </tr>
            ) : (
              data.incidents.map((incident) => (
                <tr key={incident.id} className="bg-panel transition-colors hover:bg-panel-2">
                  <td className="whitespace-nowrap px-4 py-3 text-steel">
                    <Link href={`/incidents/${incident.id}`} className="hover:text-signal">
                      {dateFmt.format(incident.occurredAt)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">
                    {incident.student.fullName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-steel">
                    {incident.classroomText}
                  </td>
                  <td className="px-4 py-3 text-steel">
                    {incident.behaviors.map((ib) => ib.behavior.label).join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={incident.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
