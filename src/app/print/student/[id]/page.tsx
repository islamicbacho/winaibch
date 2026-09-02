import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { photoThumbUrl } from "@/lib/image-utils";
import StudentProfileControls from "../../student-profile-controls";

export const metadata = { title: "เอกสารโปรไฟล์นักเรียน" };

export default async function StudentProfilePage({
  params,
  searchParams,
}: PageProps<"/print/student/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const auto = sp?.autoprint === "1";

  const studentId = Number(id);
  if (!Number.isInteger(studentId) || studentId <= 0) notFound();

  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      classroom: true,
      incidents: {
        include: {
          behaviors: { include: { behavior: true } },
          summon: true,
        },
        orderBy: { occurredAt: "desc" },
      },
    },
  });
  if (!student) notFound();

  const dataUri = student.photoDriveId
    ? photoThumbUrl(student.photoDriveId, 768)
    : "";

  const dateFmt = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const sDateTime = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <div className="min-h-screen bg-neutral-800 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-[210mm] px-4 print:max-w-none print:px-0">
        <p className="no-print mb-4 text-center text-sm font-semibold text-white/80">
          เอกสารโปรไฟล์นักเรียน — {student.fullName}
        </p>
        <div className="doc-page mx-auto w-full bg-white p-10 shadow-2xl print:p-0 print:shadow-none">
          <div className="flex items-start gap-6">
            {dataUri ? (
              <img
                src={dataUri}
                alt={student.fullName}
                className="h-36 w-36 shrink-0 rounded-full border-2 border-black object-cover"
              />
            ) : (
              <span className="flex h-36 w-36 shrink-0 items-center justify-center rounded-full border-2 border-black text-5xl font-bold">
                {(student.fullName.trim().charAt(0) || "?").toUpperCase()}
              </span>
            )}
            <div className="flex-1">
              <h1 className="text-[22pt] font-bold">เอกสารประวัติความประพฤตินักเรียน</h1>
              <table className="mt-3 w-full text-[15pt] leading-relaxed">
                <tbody>
                  <tr>
                    <td className="w-40 font-bold">ชื่อ-สกุล</td>
                    <td>ด.ช./ด.ญ. {student.fullName}</td>
                  </tr>
                  <tr>
                    <td className="font-bold">ชั้น</td>
                    <td>
                      {student.classroom
                        ? `${student.classroom.level}${student.classroom.grade}/${student.classroom.roomNo}`
                        : "-"}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold">เลขประจำตัว</td>
                    <td>{student.studentNo || "-"}</td>
                  </tr>
                  <tr>
                    <td className="font-bold">ผู้ปกครอง</td>
                    <td>
                      {student.guardianName || "-"}
                      {student.guardianPhone ? ` (${student.guardianPhone})` : ""}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-bold">จำนวนเคส</td>
                    <td>{student.incidents.length} เคส</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 border-t-2 border-black pt-3">
            <h2 className="text-[17pt] font-bold">
              ประวัติการกระทำผิด (ทั้งหมด {student.incidents.length} ครั้ง)
            </h2>
            {student.incidents.length === 0 ? (
              <p className="mt-2 text-[15pt]">ไม่มีประวัติการกระทำผิด</p>
            ) : (
              <table className="mt-3 w-full border-collapse text-[13pt]">
                <thead>
                  <tr className="border-b-2 border-black text-left">
                    <th className="py-1.5 pr-2 font-bold">ครั้งที่</th>
                    <th className="py-1.5 pr-2 font-bold">วันที่เกิดเหตุ</th>
                    <th className="py-1.5 pr-2 font-bold">พฤติกรรมที่กระทำผิด</th>
                    <th className="py-1.5 font-bold">หมายเลข กจ.1</th>
                  </tr>
                </thead>
                <tbody>
                  {student.incidents.map((incident, i) => (
                    <tr key={incident.id} className="border-b border-black/30">
                      <td className="py-1.5 pr-2">{student.incidents.length - i}</td>
                      <td className="py-1.5 pr-2">{sDateTime.format(incident.occurredAt)}</td>
                      <td className="py-1.5 pr-2">
                        {incident.behaviors.map((ib) => ib.behavior.label).join(", ") || "-"}
                      </td>
                      <td className="py-1.5">{incident.summon?.docNo ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-10 flex items-end justify-between">
            <p className="text-[14pt]">
              ออกเอกสาร ณ วันที่ {dateFmt.format(new Date())}
            </p>
            <div className="text-center text-[15pt]">
              <p>ลงชื่อ..................................................</p>
              <p className="mt-1 font-bold">({""})</p>
              <p>ผู้อำนวยการสถานศึกษา</p>
            </div>
          </div>
        </div>
      </div>
      <StudentProfileControls auto={auto} studentId={studentId} />
    </div>
  );
}