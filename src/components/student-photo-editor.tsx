"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { downscaleToDataUrl } from "@/lib/image-utils";

export default function StudentPhotoEditor({
  studentId,
  photoUrl,
  name,
}: {
  studentId: number;
  photoUrl: string;
  name: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onFile(file: File | undefined | null) {
    if (!file || !file.type.startsWith("image/")) {
      setMsg({ ok: false, text: "กรุณาเลือกไฟล์รูปภาพ" });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const small = await downscaleToDataUrl(file);
      const res = await fetch("/api/student-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, imageData: small }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: json.error ?? "อัปรูปไม่สำเร็จ" });
      } else {
        setMsg({ ok: true, text: "อัปรูปโปรไฟล์แล้ว" });
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className="h-24 w-24 rounded-full border border-line bg-white object-cover"
          />
        ) : (
          <span className="flex h-24 w-24 items-center justify-center rounded-full border border-signal/40 bg-signal/15 text-3xl font-bold text-signal">
            {(name.trim().charAt(0) || "?").toUpperCase()}
          </span>
        )}
      </div>
      <div>
        <label className="cursor-pointer rounded border border-signal/60 bg-signal/10 px-4 py-2 text-xs font-bold text-signal transition hover:bg-signal/20">
          {photoUrl ? "เปลี่ยนรูป" : "อัพรูปถ่าย"}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
        {busy && <p className="mt-2 text-xs text-steel">กำลังอัป...</p>}
        {msg && (
          <p className={`mt-2 text-xs font-medium ${msg.ok ? "text-mint" : "text-alert"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}