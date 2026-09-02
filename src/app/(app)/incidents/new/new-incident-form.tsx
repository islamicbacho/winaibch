"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { createIncident } from "@/app/actions/incidents";
import { SubmitButton } from "@/components/action-form";
import StudentAvatar from "@/components/student-avatar";
import { downscaleToDataUrl, photoThumbUrl } from "@/lib/image-utils";
import type { ActionState } from "@/lib/types";

type ClassroomOption = {
  id: number;
  label: string;
};

type BehaviorOption = {
  id: number;
  label: string;
};

type StudentSuggestion = {
  id: number;
  fullName: string;
  classroomId: number | null;
  classroomText: string;
  studentNo: string;
  guardianName: string;
  guardianPhone: string;
  photoDriveId: string;
  photoLink: string;
};

const input =
  "w-full rounded border border-line bg-night px-3 py-2 text-sm text-white placeholder:text-steel/50 focus:border-signal focus:outline-none";
const labelClass =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-steel";

function localNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewIncidentForm({
  classrooms,
  behaviors,
}: {
  classrooms: ClassroomOption[];
  behaviors: BehaviorOption[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(createIncident, {});

  const [studentId, setStudentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [studentNo, setStudentNo] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");

  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoDirty, setPhotoDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function onNameChange(value: string) {
    setFullName(value);
    setStudentId("");
    setShowSuggestions(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 2) return;
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/students/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = (await res.json()) as StudentSuggestion[];
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {
        /* ignore */
      }
    }, 300);
  }

  function pickSuggestion(s: StudentSuggestion) {
    setStudentId(String(s.id));
    setFullName(s.fullName);
    setClassroomId(s.classroomId ? String(s.classroomId) : "");
    setStudentNo(s.studentNo);
    setGuardianName(s.guardianName);
    setGuardianPhone(s.guardianPhone);
    setPhotoPreview(s.photoDriveId ? photoThumbUrl(s.photoDriveId) : "");
    setPhotoDirty(false);
    setShowSuggestions(false);
  }

  async function onPhotoFile(file: File | undefined | null) {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const small = await downscaleToDataUrl(file);
      setPhotoPreview(small);
      setPhotoDirty(true);
    } catch {
      /* ignore */
    }
  }

  function clearPhoto() {
    setPhotoPreview("");
    setPhotoDirty(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="studentId" value={studentId} />
      <input
        type="hidden"
        name="studentPhoto"
        value={photoDirty && photoPreview ? photoPreview : ""}
      />

      <section className="clip-corner border border-line bg-panel">
        <div className="hazard h-1" />
        <div className="p-6">
          <h2 className="text-base font-bold text-white">
            1. ข้อมูลนักเรียนผู้กระทำผิด
            <span className="ml-2 text-xs font-medium text-steel">
              (พิมพ์ชื่อที่เคยบันทึกไว้ ระบบเติมให้อัตโนมัติ)
            </span>
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="relative">
              <label className={labelClass} htmlFor="fullName">
                ชื่อ-สกุลนักเรียน *
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => onNameChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="เช่น อับดุลละตีฟ หะยีมะ"
                className={input}
                autoComplete="off"
              />
              {showSuggestions && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded border border-line bg-panel-2 shadow-xl">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => pickSuggestion(s)}
                      className="block w-full px-4 py-2.5 text-left text-sm text-white hover:bg-panel"
                    >
                      <span className="font-semibold">{s.fullName}</span>
                      <span className="ml-2 text-xs text-steel">
                        {s.classroomText}
                        {s.studentNo ? ` เลขประจำตัว ${s.studentNo}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={labelClass} htmlFor="classroomId">
                ชั้นเรียน *
              </label>
              <select
                id="classroomId"
                name="classroomId"
                required
                value={classroomId}
                onChange={(e) => setClassroomId(e.target.value)}
                className={input}
              >
                <option value="">— เลือกห้องเรียน —</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="studentNo">
                เลขประจำตัวนักเรียน
              </label>
              <input
                id="studentNo"
                name="studentNo"
                type="text"
                value={studentNo}
                onChange={(e) => setStudentNo(e.target.value)}
                placeholder="เช่น 12345"
                className={input}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="guardianName">
                ชื่อ-สกุลผู้ปกครอง
              </label>
              <input
                id="guardianName"
                name="guardianName"
                type="text"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="ใช้ในเอกสารเชิญผู้ปกครอง (กจ.1)"
                className={input}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="guardianPhone">
                เบอร์โทรผู้ปกครอง
              </label>
              <input
                id="guardianPhone"
                name="guardianPhone"
                type="tel"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="เช่น 08x-xxx-xxxx"
                className={input}
              />
            </div>
          </div>

          <div className="mt-4 border-t border-line pt-4">
            <label className={labelClass}>รูปประจำตัวนักเรียน (โปรไฟล์)</label>
            <div className="flex items-center gap-4">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="รูปนักเรียน"
                  className="h-20 w-20 rounded-full border border-line bg-white object-cover"
                />
              ) : (
                <StudentAvatar photoDriveId="" name={suggestions.find((s) => s.id === Number(studentId))?.fullName ?? fullName} className="h-20 w-20 text-xl" />
              )}
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer rounded border border-signal/60 bg-signal/10 px-4 py-2 text-xs font-bold text-signal transition hover:bg-signal/20">
                  {photoPreview ? "เปลี่ยนรูป" : "อัพรูปถ่าย"}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onPhotoFile(e.target.files?.[0])}
                  />
                </label>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="rounded border border-line px-3 py-2 text-xs font-semibold text-steel transition hover:border-white hover:text-white"
                  >
                    ลบรูป
                  </button>
                )}
                {!photoPreview && (
                  <span className="text-xs text-steel">
                    ถ่าย/เลือกรูปประจำตัว — จะแสดงในรายชื่อและเอกสารโปรไฟล์
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="clip-corner border border-line bg-panel">
        <div className="hazard-red h-1" />
        <div className="p-6">
          <h2 className="text-base font-bold text-white">2. เหตุการณ์</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="occurredAt">
                วัน-เวลาที่เกิดเหตุ *
              </label>
              <input
                id="occurredAt"
                name="occurredAt"
                type="datetime-local"
                required
                defaultValue={localNow()}
                className={input}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="knownVia">
                ทราบเหตุการณ์ได้อย่างไร
              </label>
              <select id="knownVia" name="knownVia" className={input} defaultValue="เห็นเอง">
                <option value="เห็นเอง">เห็นเอง</option>
                <option value="ได้รับการร้องเรียน">ได้รับการร้องเรียน</option>
                <option value="ปรากฏตามรายงาน">ปรากฏตามรายงาน</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClass} htmlFor="description">
              รายละเอียดเหตุการณ์
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="เล่าเหตุการณ์โดยย่อ สถานที่ และพยาน (ถ้ามี)"
              className={input}
            />
          </div>
        </div>
      </section>

      <section className="clip-corner border border-line bg-panel">
        <div className="hazard h-1" />
        <div className="p-6">
          <h2 className="text-base font-bold text-white">
            3. พฤติกรรมที่กระทำผิด * <span className="text-xs font-medium text-steel">(ตามเช็คลิสต์ใน กจ.1 / กจ.2 — เลือกได้หลายข้อ)</span>
          </h2>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {behaviors.map((b) => (
              <label key={b.id} className="cursor-pointer">
                <input type="checkbox" name="behaviors" value={b.id} className="peer sr-only" />
                <span className="inline-block rounded-full border border-line px-4 py-1.5 text-sm font-medium text-steel transition hover:border-steel peer-checked:border-signal peer-checked:bg-signal/15 peer-checked:text-signal">
                  {b.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {state?.error && (
        <p className="rounded border border-alert/40 bg-alert/10 px-4 py-3 text-sm font-medium text-alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <SubmitButton
          className="clip-corner bg-signal px-8 py-3 text-base font-extrabold text-night transition hover:brightness-110 disabled:opacity-60"
          pendingText="กำลังบันทึก..."
        >
          บันทึกเหตุการณ์
        </SubmitButton>
        <p className="text-xs text-steel">
          บันทึกครั้งเดียว — ข้อมูลจะถูกใช้ในเอกสาร กจ.1 / กจ.1.1 / กจ.2 อัตโนมัติ
        </p>
      </div>
    </form>
  );
}
