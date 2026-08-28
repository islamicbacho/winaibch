import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import StatusBadge from "@/components/status-badge";

export default async function StudentDetailPage({
  params,
}: PageProps<"/students/[id]">) {
  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isInteger(studentId) || studentId <= 0) notFound();

  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      classroom: true,
      incidents: {
        include: { behaviors: { include: { behavior: true } } },
        orderBy: { occurredAt: "desc" },
      },
    },
  });
  if (!student) notFound();

  const dateFmt = new Intl.DateTimeFormat("th-TH", { dateStyle: "long" });

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/students" className="text-xs font-semibold text-steel hover:text-signal">
        ← กลับรายชื่อนักเรียน
      </Link>

      <div className="mt-3">
        <h1 className="text-2xl font-extrabold text-white">
          {student.fullName}
          <span className="ml-2 text-base font-medium text-steel">
            {student.classroom
              ? `${student.classroom.level}${student.classroom.grade}/${student.classroom.roomNo}`
              : ""}
            {student.studentNo ? ` • เลขประจำตัว ${student.studentNo}` : ""}
          </span>
        </h1>
        <p className="mt-1 text-sm text-steel">
          ผู้ปกครอง: {student.guardianName || "-"}
          {student.guardianPhone ? ` • ${student.guardianPhone}` : ""} • เคสทั้งหมด{" "}
          {student.incidents.length} เคส
        </p>
      </div>

      {student.incidents.length === 0 ? (
        <div className="clip-corner mt-8 border border-line bg-panel p-14 text-center">
          <p className="text-sm text-steel">ไม่มีประวัติเคส</p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {student.incidents.map((incident) => (
            <Link
              key={incident.id}
              href={`/incidents/${incident.id}`}
              className="clip-corner block border border-line bg-panel transition-colors hover:border-signal/50"
            >
              <div className="hazard h-1" />
              <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-semibold text-white">
                    {dateFmt.format(incident.occurredAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {incident.behaviors.map((ib) => (
                      <span
                        key={ib.behaviorId}
                        className="rounded-full border border-line px-2.5 py-0.5 text-xs text-steel"
                      >
                        {ib.behavior.label}
                      </span>
                    ))}
                  </div>
                </div>
                <StatusBadge status={incident.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
