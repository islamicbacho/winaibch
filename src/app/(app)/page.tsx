import Link from "next/link";
import { db } from "@/lib/db";
import { statusLabel } from "@/components/status-badge";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function BarRow({
  label,
  count,
  max,
  tone = "bg-signal",
}: {
  label: string;
  count: number;
  max: number;
  tone?: string;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 truncate text-sm text-steel" title={label}>
        {label}
      </span>
      <div className="h-5 flex-1 overflow-hidden rounded-sm bg-night">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-sm font-bold tabular-nums text-white">{count}</span>
    </div>
  );
}

export default async function DashboardPage() {
  const now = new Date();
  const startToday = startOfDay(now);
  const startTomorrow = new Date(startToday);
  startTomorrow.setDate(startTomorrow.getDate() + 1);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    todayCount,
    monthCount,
    totalCount,
    openCount,
    byBehaviorRaw,
    classrooms,
    recent,
    watchlistRaw,
  ] = await Promise.all([
    db.incident.count({ where: { occurredAt: { gte: startToday, lt: startTomorrow } } }),
    db.incident.count({ where: { occurredAt: { gte: startMonth } } }),
    db.incident.count(),
    db.incident.count({ where: { status: { not: "closed" } } }),
    db.incidentBehavior.groupBy({
      by: ["behaviorId"],
      _count: { behaviorId: true },
      orderBy: { _count: { behaviorId: "desc" } },
      take: 8,
    }),
    db.classroom.findMany(),
    db.incident.findMany({
      include: { student: true, behaviors: { include: { behavior: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.incident.groupBy({
      by: ["studentId"],
      _count: { studentId: true },
      having: { studentId: { _count: { gte: 2 } } },
      orderBy: { _count: { studentId: "desc" } },
      take: 5,
    }),
  ]);

  const behaviorCounts = byBehaviorRaw.map((row) => ({
    id: row.behaviorId,
    count: row._count.behaviorId,
  }));
  const behaviorLabels = await db.behavior.findMany({
    where: { id: { in: behaviorCounts.map((b) => b.id) } },
  });
  const behaviorName = new Map(behaviorLabels.map((b) => [b.id, b.label]));
  const byBehavior = behaviorCounts
    .map((b) => ({ label: behaviorName.get(b.id) ?? "-", count: b.count }))
    .sort((a, b) => b.count - a.count);
  const maxBehavior = byBehavior[0]?.count ?? 0;

  const byClassRaw = await db.incident.groupBy({
    by: ["classroomId"],
    _count: { classroomId: true },
  });
  const classMap = new Map(classrooms.map((c) => [c.id, `${c.level}${c.grade}/${c.roomNo}`]));
  const byClass = byClassRaw
    .map((row) => ({
      label: row.classroomId ? (classMap.get(row.classroomId) ?? "ไม่ระบุ") : "ไม่ระบุ",
      count: row._count.classroomId,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const maxClass = byClass[0]?.count ?? 0;

  const watchlistIds = watchlistRaw.map((w) => w.studentId);
  const watchlistStudents = watchlistIds.length
    ? await db.student.findMany({
        where: { id: { in: watchlistIds } },
        include: { classroom: true, _count: { select: { incidents: true } } },
      })
    : [];
  const watchCount = new Map(watchlistRaw.map((w) => [w.studentId, w._count.studentId]));
  const watchlist = watchlistStudents
    .map((s) => ({ ...s, caseCount: watchCount.get(s.id) ?? 0 }))
    .sort((a, b) => b.caseCount - a.caseCount);

  const STATS = [
    { label: "เคสวันนี้", value: todayCount, tone: "text-white" },
    { label: "เคสเดือนนี้", value: monthCount, tone: "text-signal" },
    { label: "เคสทั้งหมด", value: totalCount, tone: "text-white" },
    { label: "รอดำเนินการ", value: openCount, tone: "text-alert" },
  ];

  const dateFmt = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold italic tracking-tight text-white">
            แดชบอร์ด<span className="text-signal">.</span>
          </h1>
          <p className="mt-1 text-sm text-steel">
            ภาพรวมความประพฤตินักเรียน โรงเรียนบาเจาะ
          </p>
        </div>
        <Link
          href="/incidents/new"
          className="clip-corner bg-signal px-5 py-2.5 text-sm font-bold text-night transition hover:brightness-110"
        >
          + บันทึกเหตุการณ์ใหม่
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="clip-corner border border-line bg-panel">
            <div className="hazard h-1" />
            <div className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-steel">
                {s.label}
              </p>
              <p className={`mt-2 text-4xl font-extrabold tabular-nums ${s.tone}`}>
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="clip-corner border border-line bg-panel">
          <div className="hazard h-1" />
          <div className="p-6">
            <h2 className="text-base font-bold text-white">พฤติกรรมที่พบบ่อย</h2>
            <div className="mt-4 space-y-2.5">
              {byBehavior.length === 0 ? (
                <p className="text-sm text-steel">ยังไม่มีข้อมูล</p>
              ) : (
                byBehavior.map((row) => (
                  <BarRow key={row.label} label={row.label} count={row.count} max={maxBehavior} />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="clip-corner border border-line bg-panel">
          <div className="hazard h-1" />
          <div className="p-6">
            <h2 className="text-base font-bold text-white">เคสตามห้องเรียน</h2>
            <div className="mt-4 space-y-2.5">
              {byClass.length === 0 ? (
                <p className="text-sm text-steel">ยังไม่มีข้อมูล</p>
              ) : (
                byClass.map((row) => (
                  <BarRow
                    key={row.label}
                    label={row.label}
                    count={row.count}
                    max={maxClass}
                    tone="bg-sky-400"
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="clip-corner border border-line bg-panel">
          <div className="hazard-red h-1" />
          <div className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">เคสล่าสุด</h2>
              <Link href="/incidents" className="text-xs font-semibold text-signal hover:underline">
                ดูทั้งหมด →
              </Link>
            </div>
            <div className="mt-4 space-y-2">
              {recent.length === 0 ? (
                <p className="text-sm text-steel">ยังไม่มีเคส</p>
              ) : (
                recent.map((incident) => (
                  <Link
                    key={incident.id}
                    href={`/incidents/${incident.id}`}
                    className="flex items-center justify-between gap-3 rounded border border-line bg-panel-2 px-4 py-2.5 transition hover:border-signal/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {incident.student.fullName}
                        <span className="ml-2 text-xs font-normal text-steel">
                          {incident.classroomText}
                        </span>
                      </p>
                      <p className="truncate text-xs text-steel">
                        {incident.behaviors.map((ib) => ib.behavior.label).join(", ") || "-"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-steel">
                      {dateFmt.format(incident.occurredAt)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="clip-corner border border-line bg-panel">
          <div className="hazard-red h-1" />
          <div className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">นักเรียนเฝ้าระวัง</h2>
              <Link href="/students" className="text-xs font-semibold text-signal hover:underline">
                ดูทั้งหมด →
              </Link>
            </div>
            <div className="mt-4 space-y-2">
              {watchlist.length === 0 ? (
                <p className="text-sm text-steel">
                  ยังไม่มีนักเรียนที่ต้องเฝ้าระวัง (2 เคสขึ้นไป)
                </p>
              ) : (
                watchlist.map((s) => (
                  <Link
                    key={s.id}
                    href={`/students/${s.id}`}
                    className="flex items-center justify-between gap-3 rounded border border-line bg-panel-2 px-4 py-2.5 transition hover:border-alert/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{s.fullName}</p>
                      <p className="text-xs text-steel">
                        {s.classroom
                          ? `${s.classroom.level}${s.classroom.grade}/${s.classroom.roomNo}`
                          : "ไม่ระบุห้อง"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-alert/50 bg-alert/10 px-3 py-0.5 text-xs font-bold text-alert">
                      {s.caseCount} เคส
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-steel">
        สถานะเคส: {["recorded", "summoned", "agreement", "corrective", "signing", "closed"]
          .map(statusLabel)
          .join(" → ")}
      </p>
    </div>
  );
}
