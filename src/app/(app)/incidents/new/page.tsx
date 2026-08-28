import { db } from "@/lib/db";
import NewIncidentForm from "./new-incident-form";

export const metadata = { title: "บันทึกเหตุการณ์" };

export default async function NewIncidentPage() {
  const [classrooms, behaviors] = await Promise.all([
    db.classroom.findMany({
      orderBy: [{ level: "asc" }, { grade: "asc" }, { roomNo: "asc" }],
    }),
    db.behavior.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-extrabold italic tracking-tight text-white">
        บันทึกเหตุการณ์<span className="text-signal">.</span>
      </h1>
      <p className="mt-1 text-sm text-steel">
        กรอกครั้งเดียว — ใช้ได้ทั้งเอกสาร กจ.1 / กจ.1.1 / กจ.2
      </p>

      <div className="mt-8">
        <NewIncidentForm
          classrooms={classrooms.map((c) => ({
            id: c.id,
            label: `${c.level}${c.grade}/${c.roomNo}`,
          }))}
          behaviors={behaviors.map((b) => ({ id: b.id, label: b.label }))}
        />
      </div>
    </div>
  );
}
