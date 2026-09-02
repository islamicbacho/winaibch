import { db } from "@/lib/db";
import StudentDirectory from "@/components/student-directory";

export const metadata = { title: "นักเรียน" };

export default async function StudentsPage() {
  const students = await db.student.findMany({
    include: {
      classroom: true,
      _count: { select: { incidents: true } },
      incidents: { orderBy: { occurredAt: "desc" }, take: 1 },
    },
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-extrabold italic tracking-tight text-white">
        นักเรียน<span className="text-signal">.</span>
      </h1>
      <p className="mt-1 text-sm text-steel">
        รายชื่อที่เคยถูกบันทึก ({students.length} คน) — พิมพ์ชื่อเพื่อค้นหาเคส พร้อมดูรูปประจำตัวและพิมพ์เอกสารโปรไฟล์
      </p>

      <StudentDirectory
        students={students.map((s) => ({
          id: s.id,
          fullName: s.fullName,
          classroomLabel: s.classroom
            ? `${s.classroom.level}${s.classroom.grade}/${s.classroom.roomNo}`
            : "",
          studentNo: s.studentNo,
          photoDriveId: s.photoDriveId,
          incidentCount: s._count.incidents,
          lastIncidentAt: s.incidents[0]?.occurredAt.toISOString() ?? null,
        }))}
      />
    </div>
  );
}