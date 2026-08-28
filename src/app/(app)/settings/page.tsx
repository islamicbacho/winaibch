import { db } from "@/lib/db";
import { ActionForm, SubmitButton } from "@/components/action-form";
import {
  changePassword,
  createBehavior,
  deleteBehavior,
  moveBehavior,
  toggleBehavior,
  updateBehaviorLabel,
  updateSettings,
} from "@/app/actions/settings";

export const metadata = { title: "ตั้งค่า" };

const input =
  "w-full rounded border border-line bg-night px-3 py-2 text-sm text-white placeholder:text-steel/50 focus:border-signal focus:outline-none";
const btnSmall =
  "shrink-0 rounded border border-line px-3 py-1.5 text-xs font-semibold text-steel transition-colors hover:border-signal hover:text-signal disabled:opacity-50";
const btnDanger =
  "shrink-0 rounded border border-line px-3 py-1.5 text-xs font-semibold text-steel transition-colors hover:border-alert hover:text-alert disabled:opacity-50";

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-steel">
        {label}
      </label>
      <input name={name} type={type} defaultValue={defaultValue} className={input} />
    </div>
  );
}

export default async function SettingsPage() {
  const [settings, behaviors] = await Promise.all([
    db.setting.findMany(),
    db.behavior.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const s = Object.fromEntries(settings.map((row) => [row.key, row.value]));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold italic tracking-tight text-white">
          ตั้งค่า<span className="text-signal">.</span>
        </h1>
        <p className="mt-1 text-sm text-steel">
          ข้อมูลเหล่านี้ถูกดึงไปใช้อัตโนมัติในเอกสาร กจ.1 / กจ.1.1 / กจ.2
        </p>
      </div>

      <section className="clip-corner border border-line bg-panel">
        <div className="hazard h-1" />
        <div className="p-6">
          <h2 className="text-base font-bold text-white">ข้อมูลโรงเรียนและผู้ลงนาม</h2>
          <ActionForm action={updateSettings} className="mt-5 space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="ชื่อโรงเรียน" name="schoolName" defaultValue={s.schoolName} />
              <Field label="สังกัด" name="officeName" defaultValue={s.officeName} />
              <Field label="ปีการศึกษา (พ.ศ.)" name="academicYear" defaultValue={s.academicYear} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="ชื่อผู้อำนวยการ" name="directorName" defaultValue={s.directorName} />
              <Field label="ตำแหน่ง (ผอ.)" name="directorPosition" defaultValue={s.directorPosition} />
              <Field label="ชื่อรองผู้อำนวยการ (กจน.)" name="deputyName" defaultValue={s.deputyName} />
              <Field label="ตำแหน่ง (รองผอ.)" name="deputyPosition" defaultValue={s.deputyPosition} />
            </div>
            <div className="max-w-xs">
              <Field
                label="เลขที่หนังสือถัดไป"
                name="docCounter"
                defaultValue={s.docCounter}
                type="number"
              />
            </div>
            <div>
              <Field
                label="โฟลเดอร์เก็บ PDF (เครื่องนี้)"
                name="savePath"
                defaultValue={s.savePath ?? "D:\\เอกสารกจ"}
              />
              <p className="mt-1 text-xs text-steel">
                เอกสาร PDF จะถูกบันทึกที่โฟลเดอร์นี้เมื่อกดปุ่มบันทึกบนหน้าพิมพ์
                (ถ้าโฟลเดอร์นี้อยู่ใน Google Drive for Desktop ไฟล์จะขึ้นเว็บอัตโนมัติ)
              </p>
            </div>
            <SubmitButton
              className="clip-corner bg-signal px-6 py-2.5 text-sm font-bold text-night transition hover:brightness-110 disabled:opacity-60"
              pendingText="กำลังบันทึก..."
            >
              บันทึกการตั้งค่า
            </SubmitButton>
          </ActionForm>
        </div>
      </section>

      <section className="clip-corner border border-line bg-panel">
        <div className="hazard h-1" />
        <div className="p-6">
          <h2 className="text-base font-bold text-white">รายการพฤติกรรม (เช็คลิสต์ใน กจ.1 / กจ.2)</h2>
          <ActionForm action={createBehavior} className="mt-4 flex flex-wrap items-start gap-3">
            <div className="min-w-64 flex-1">
              <input name="label" type="text" placeholder="ชื่อพฤติกรรมใหม่" className={input} />
            </div>
            <SubmitButton className={btnSmall} pendingText="กำลังเพิ่ม...">
              เพิ่ม
            </SubmitButton>
          </ActionForm>

          <div className="mt-5 divide-y divide-line border border-line rounded">
            {behaviors.map((b, i) => (
              <div
                key={b.id}
                className={`flex flex-wrap items-center gap-2 p-3 ${b.isActive ? "" : "opacity-50"}`}
              >
                <div className="flex flex-col gap-0.5">
                  <ActionForm action={moveBehavior}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="dir" value="up" />
                    <SubmitButton
                      className="rounded border border-line px-1.5 text-xs leading-none text-steel hover:text-signal disabled:opacity-30"
                      pendingText="..."
                    >
                      ▲
                    </SubmitButton>
                  </ActionForm>
                  <ActionForm action={moveBehavior}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="dir" value="down" />
                    <SubmitButton
                      className="rounded border border-line px-1.5 text-xs leading-none text-steel hover:text-signal disabled:opacity-30"
                      pendingText="..."
                    >
                      ▼
                    </SubmitButton>
                  </ActionForm>
                </div>
                <span className="w-7 text-center text-xs font-bold text-steel">{i + 1}</span>

                <div className="min-w-52 flex-1">
                  <ActionForm action={updateBehaviorLabel} className="flex gap-2">
                    <input type="hidden" name="id" value={b.id} />
                    <input name="label" type="text" defaultValue={b.label} className={input} />
                    <SubmitButton className={btnSmall} pendingText="...">
                      บันทึก
                    </SubmitButton>
                  </ActionForm>
                </div>

                <ActionForm action={toggleBehavior}>
                  <input type="hidden" name="id" value={b.id} />
                  <SubmitButton className={btnSmall} pendingText="...">
                    {b.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                  </SubmitButton>
                </ActionForm>
                <ActionForm action={deleteBehavior} confirm={`ลบ "${b.label}"?`}>
                  <input type="hidden" name="id" value={b.id} />
                  <SubmitButton className={btnDanger} pendingText="...">
                    ลบ
                  </SubmitButton>
                </ActionForm>
                {!b.isActive && (
                  <span className="text-xs font-semibold text-alert">ปิดใช้งาน</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="clip-corner border border-line bg-panel">
        <div className="hazard-red h-1" />
        <div className="p-6">
          <h2 className="text-base font-bold text-white">เปลี่ยนรหัสผ่าน</h2>
          <ActionForm action={changePassword} className="mt-4 max-w-md space-y-4">
            <Field label="รหัสผ่านปัจจุบัน" name="current" type="password" />
            <Field label="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)" name="next" type="password" />
            <Field label="ยืนยันรหัสผ่านใหม่" name="confirm" type="password" />
            <SubmitButton
              className="clip-corner bg-signal px-6 py-2.5 text-sm font-bold text-night transition hover:brightness-110 disabled:opacity-60"
              pendingText="กำลังเปลี่ยน..."
            >
              เปลี่ยนรหัสผ่าน
            </SubmitButton>
          </ActionForm>
        </div>
      </section>
    </div>
  );
}
