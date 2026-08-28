import { db } from "@/lib/db";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { createClassroom, deleteClassroom, updateAdvisor } from "@/app/actions/classes";

export const metadata = { title: "ห้องเรียน" };

const input =
  "w-full rounded border border-line bg-night px-3 py-2 text-sm text-white placeholder:text-steel/50 focus:border-signal focus:outline-none";
const btnSmall =
  "rounded border border-line px-3 py-1.5 text-xs font-semibold text-steel transition-colors hover:border-signal hover:text-signal disabled:opacity-50";
const btnDanger =
  "rounded border border-line px-3 py-1.5 text-xs font-semibold text-steel transition-colors hover:border-alert hover:text-alert";

export default async function ClassesPage() {
  const rooms = await db.classroom.findMany({
    orderBy: [{ level: "asc" }, { grade: "asc" }, { roomNo: "asc" }],
  });

  const groups = new Map<string, typeof rooms>();
  for (const room of rooms) {
    const key = `${room.level}${room.grade}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(room);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-extrabold italic tracking-tight text-white">
        ห้องเรียน<span className="text-signal">.</span>
      </h1>
      <p className="mt-1 text-sm text-steel">
        ตั้งครูที่ปรึกษาครั้งเดียวต่อห้อง — ระบบเติมในเอกสาร กจ.1 / กจ.2 ให้อัตโนมัติ
      </p>

      <div className="clip-corner mt-8 border border-line bg-panel">
        <div className="hazard h-1" />
        <div className="p-6">
          <h2 className="text-base font-bold text-white">เพิ่มห้องเรียน</h2>
          <ActionForm action={createClassroom} className="mt-4 flex flex-wrap items-start gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-steel">
                ระดับ
              </label>
              <select name="level" className={input} defaultValue="ม.">
                <option value="ม.">ม.</option>
                <option value="ป.">ป.</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-steel">
                ชั้นปี
              </label>
              <select name="grade" className={input} defaultValue="1">
                {[1, 2, 3, 4, 5, 6].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-steel">
                ห้องที่
              </label>
              <input
                name="roomNo"
                type="number"
                min={1}
                defaultValue={1}
                className={`${input} w-24`}
              />
            </div>
            <div className="min-w-52 flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-steel">
                ครูที่ปรึกษา (ใส่ได้ภายหลัง)
              </label>
              <input name="advisorName" type="text" placeholder="ชื่อ-สกุลครูที่ปรึกษา" className={input} />
            </div>
            <SubmitButton
              className="clip-corner mt-6 bg-signal px-5 py-2 text-sm font-bold text-night transition hover:brightness-110 disabled:opacity-60"
              pendingText="กำลังเพิ่ม..."
            >
              เพิ่มห้องเรียน
            </SubmitButton>
          </ActionForm>
        </div>
      </div>

      {rooms.length === 0 ? (
        <p className="mt-10 text-center text-sm text-steel">ยังไม่มีห้องเรียน — เพิ่มห้องแรกด้านบน</p>
      ) : (
        <div className="mt-8 space-y-8">
          {[...groups.entries()].map(([key, groupRooms]) => (
            <section key={key}>
              <h2 className="mb-3 text-lg font-bold text-signal">{key}</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {groupRooms.map((room) => (
                  <div key={room.id} className="clip-corner border border-line bg-panel">
                    <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                      <p className="text-xl font-extrabold text-white">
                        {room.level}
                        {room.grade}/{room.roomNo}
                      </p>
                      <ActionForm action={deleteClassroom} confirm={`ลบห้อง ${room.level}${room.grade}/${room.roomNo}?`}>
                        <input type="hidden" name="id" value={room.id} />
                        <SubmitButton className={btnDanger} pendingText="...">
                          ลบห้อง
                        </SubmitButton>
                      </ActionForm>
                    </div>
                    <ActionForm action={updateAdvisor} className="p-4">
                      <input type="hidden" name="id" value={room.id} />
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-steel">
                        ครูที่ปรึกษา
                      </label>
                      <div className="flex gap-2">
                        <input
                          name="advisorName"
                          type="text"
                          defaultValue={room.advisorName}
                          placeholder="ยังไม่ระบุ"
                          className={input}
                        />
                        <SubmitButton className={btnSmall} pendingText="...">
                          บันทึก
                        </SubmitButton>
                      </div>
                    </ActionForm>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
