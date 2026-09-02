"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import StudentAvatar from "@/components/student-avatar";

export type DirectoryStudent = {
  id: number;
  fullName: string;
  classroomLabel: string;
  studentNo: string;
  photoDriveId: string;
  incidentCount: number;
  lastIncidentAt: string | null;
};

export default function StudentDirectory({ students }: { students: DirectoryStudent[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return students;
    return students.filter((s) => {
      const name = s.fullName.toLowerCase();
      const no = s.studentNo.toString().toLowerCase();
      return name.includes(term) || no.includes(term);
    });
  }, [q, students]);

  const dateFmt = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" });

  return (
    <>
      <div className="relative mt-6">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="พิมพ์ชื่อนักเรียน หรือเลขประจำตัว เพื่อค้นหา (เช่น อับดุล, 12345)..."
          className="w-full rounded border border-line bg-panel-2 px-4 py-3 pl-11 text-sm text-white placeholder:text-steel/60 focus:border-signal focus:outline-none"
        />
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-signal">
          ⌕
        </span>
      </div>

      <div className="mt-6 overflow-x-auto rounded border border-line">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-panel-2 text-xs uppercase tracking-wider text-steel">
              <th className="px-4 py-3 font-semibold">รูป</th>
              <th className="px-4 py-3 font-semibold">ชื่อ-สกุล</th>
              <th className="px-4 py-3 font-semibold">ชั้น/เลขประจำตัว</th>
              <th className="px-4 py-3 font-semibold">เคสทั้งหมด</th>
              <th className="px-4 py-3 font-semibold">เคสล่าสุด</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-steel">
                  ไม่พบนักเรียนที่ตรงกับ “{q}”
                </td>
              </tr>
            ) : (
              filtered.map((student) => (
                <tr key={student.id} className="bg-panel transition-colors hover:bg-panel-2">
                  <td className="px-4 py-3">
                    <StudentAvatar photoDriveId={student.photoDriveId} name={student.fullName} />
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">
                    <Link href={`/students/${student.id}`} className="hover:text-signal">
                      {student.fullName}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-steel">
                    {student.classroomLabel || "-"}
                    {student.studentNo ? ` • ${student.studentNo}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-signal/40 bg-signal/10 px-3 py-0.5 text-xs font-bold text-signal">
                      {student.incidentCount}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-steel">
                    {student.lastIncidentAt ? dateFmt.format(new Date(student.lastIncidentAt)) : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}