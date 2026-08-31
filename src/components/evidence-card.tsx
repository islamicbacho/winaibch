"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ExistingEvidence = {
  id: number;
  driveFileId: string;
  driveWebViewLink: string;
  filename: string;
  title: string;
  description: string;
  mimeType: string;
  createdAt: string | Date;
};

function thumbUrl(ev: ExistingEvidence): string {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(ev.driveFileId)}&sz=w480`;
}

const input =
  "w-full rounded border border-line bg-night px-3 py-2 text-sm text-white placeholder:text-steel/50 focus:border-signal focus:outline-none";

async function downscaleToDataUrl(file: File, maxSide = 1280, quality = 0.82): Promise<string> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error("read file failed"));
    fr.readAsDataURL(file);
  });

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("decode image failed"));
    img.src = dataUrl;
  });

  let { width, height } = img;
  if (width > maxSide || height > maxSide) {
    const scale = Math.min(maxSide / width, maxSide / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, width, height);
  c.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export default function EvidenceCard({
  incidentId,
  existing,
}: {
  incidentId: number;
  existing: ExistingEvidence[];
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);

  async function loadFile(file: File | undefined | null) {
    if (!file || !file.type.startsWith("image/")) {
      setMsg({ ok: false, text: "กรุณาเลือกไฟล์ภาพ (JPG/PNG/WebP)" });
      return;
    }
    try {
      const small = await downscaleToDataUrl(file);
      setPreview(small);
      setMsg(null);
    } catch {
      setMsg({ ok: false, text: "อ่านไฟล์ภาพไม่สำเร็จ" });
    }
  }

  async function upload(dataUrl: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId,
          description: description.trim(),
          imageData: dataUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: json.error ?? "อัปโหลดไม่สำเร็จ" });
      } else {
        setMsg({ ok: true, text: "บันทึกหลักฐานแล้ว" });
        setPreview(null);
        setDescription("");
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setRemoving(id);
    try {
      await fetch("/api/evidence", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      router.refresh();
    } finally {
      setRemoving(null);
    }
  }

  const timeFmt = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className="clip-corner border border-line bg-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-white">หลักฐานภาพถ่าย 📷</h2>
          <p className="mt-1 text-xs text-steel">
            ถ่ายรูปหรือแนบภาพหลักฐาน — ภาพจะถูกเก็บไว้ใน Google Drive
          </p>
        </div>
        <span className="text-xs font-semibold text-steel">{existing.length} รายการ</span>
      </div>

      <div className="mt-4 space-y-3">
        {preview ? (
          <div>
            <img
              src={preview}
              alt="หลักฐาน"
              className="mx-auto max-h-72 w-full rounded border border-line bg-white object-contain"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="คำอธิบายหลักฐาน (เช่น: ติดบุหรี่ที่หน้าห้องน้ำ)"
              className={`${input} mt-3`}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => upload(preview)}
                disabled={busy}
                className="clip-corner bg-signal px-4 py-2 text-xs font-bold text-night transition hover:brightness-110 disabled:opacity-60"
              >
                {busy ? "กำลังอัปโหลด..." : "บันทึกลง Drive"}
              </button>
              <button
                type="button"
                onClick={() => setPreview(null)}
                disabled={busy}
                className="rounded border border-line px-3 py-2 text-xs font-semibold text-steel transition hover:border-white hover:text-white"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded border border-signal/60 bg-signal/10 px-4 py-2 text-xs font-bold text-signal transition hover:bg-signal/20">
              📷 ถ่ายรูปกับกล้อง
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => loadFile(e.target.files?.[0])}
                className="hidden"
              />
            </label>
            <label className="cursor-pointer rounded border border-line px-3 py-2 text-xs font-semibold text-steel transition hover:border-white hover:text-white">
              เลือกจากแกลลอรี่ / คอมพิวเตอร์
              <input
                type="file"
                accept="image/*"
                onChange={(e) => loadFile(e.target.files?.[0])}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {existing.length > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-steel">
            ภาพที่บันทึกแล้ว
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {existing.map((ev) => (
              <div
                key={ev.id}
                className="clip-corner border border-line bg-night/60 p-3"
              >
                <a href={ev.driveWebViewLink} target="_blank" rel="noreferrer">
                  <img
                    src={thumbUrl(ev)}
                    alt={ev.description || ev.filename}
                    className="h-36 w-full rounded border border-line bg-white object-cover"
                  />
                </a>
                <div className="mt-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {ev.description || ev.filename}
                    </p>
                    <p className="text-xs text-steel">
                      {timeFmt.format(new Date(ev.createdAt))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(ev.id)}
                    disabled={removing === ev.id}
                    className="shrink-0 rounded border border-line px-2 py-1 text-xs font-semibold text-steel transition hover:border-alert hover:text-alert"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {msg && (
        <p className={`mt-3 text-xs font-medium ${msg.ok ? "text-mint" : "text-alert"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}