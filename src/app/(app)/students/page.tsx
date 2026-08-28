import Link from "next/link";
import { db } from "@/lib/db";

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

  const dateFmt = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" });

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-extrabold italic tracking-tight text-white">
        นักเรียน<span className="text-signal">.</span>
      </h1>
      <p className="mt-1 text-sm text-steel">
        รายชื่อที่เคยถูกบันทึก ({students.length} คน) — ระบบสร้างอัตโนมัติจากเคส
      </p>

      {students.length === 0 ? (
        <div className="clip-corner mt-8 border border-line bg-panel p-14 text-center">
          <p className="text-sm text-steel">ยังไม่มีข้อมูล — จะปรากฏเมื่อบันทึกเหตุการณ์แรก</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-panel-2 text-xs uppercase tracking-wider text-steel">
                <th className="px-4 py-3 font-semibold">ชื่อ-สกุล</th>
                <th className="px-4 py-3 font-semibold">ชั้น/เลขประจำตัว</th>
                <th className="px-4 py-3 font-semibold">เคสทั้งหมด</th>
                <th className="px-4 py-3 font-semibold">เคสล่าสุด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {students.map((student) => (
                <tr key={student.id} className="bg-panel transition-colors hover:bg-panel-2">
                  <td className="px-4 py-3 font-semibold text-white">
                    <Link href={`/students/${student.id}`} className="hover:text-signal">
                      {student.fullName}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-steel">
                    {student.classroom
                      ? `${student.classroom.level}${student.classroom.grade}/${student.classroom.roomNo}`
                      : "-"}
                    {student.studentNo ? ` • ${student.studentNo}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-signal/40 bg-signal/10 px-3 py-0.5 text-xs font-bold text-signal">
                      {student._count.incidents}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-steel">
                    {student.incidents[0]
                      ? dateFmt.format(student.incidents[0].occurredAt)
                      : "-"}
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
