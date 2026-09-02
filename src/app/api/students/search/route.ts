import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json([]);

  const students = await db.student.findMany({
    where: { fullName: { contains: q } },
    include: { classroom: true },
    orderBy: { fullName: "asc" },
    take: 8,
  });

  return NextResponse.json(
    students.map((s) => ({
      id: s.id,
      fullName: s.fullName,
      classroomId: s.classroomId,
      classroomText: s.classroom
        ? `${s.classroom.level}${s.classroom.grade}/${s.classroom.roomNo}`
        : "",
      studentNo: s.studentNo,
      guardianName: s.guardianName,
      guardianPhone: s.guardianPhone,
      photoDriveId: s.photoDriveId,
      photoLink: s.photoLink,
    }))
  );
}
