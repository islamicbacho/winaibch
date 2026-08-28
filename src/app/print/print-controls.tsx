"use client";

import { useEffect, useState } from "react";

export default function PrintControls({
  auto,
  docType,
  incidentId,
}: {
  auto: boolean;
  docType: string;
  incidentId: number;
}) {
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (auto) {
      const timer = setTimeout(() => window.print(), 700);
      return () => clearTimeout(timer);
    }
  }, [auto]);

  async function savePdf() {
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch("/api/docs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType, incidentId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: json.error ?? "บันทึกไม่สำเร็จ" });
      } else if (json.webViewLink && json.webViewLink.startsWith("http")) {
        setResult({
          ok: true,
          message: `บันทึกขึ้น Drive แล้ว — เปิดดูได้ที่ลิงก์`,
        });
        window.open(json.webViewLink, "_blank");
      } else {
        setResult({ ok: true, message: `บันทึกแล้วที่: ${json.path}` });
      }
    } catch {
      setResult({ ok: false, message: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="no-print fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 font-sans">
      {result && (
        <p
          className={`max-w-md rounded border px-4 py-2 text-xs font-medium ${
            result.ok
              ? "border-mint/50 bg-mint/10 text-mint"
              : "border-alert/50 bg-alert/10 text-alert"
          }`}
        >
          {result.message}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={savePdf}
          disabled={saving}
          className="clip-corner bg-signal px-5 py-2.5 text-sm font-bold text-night transition hover:brightness-110 disabled:opacity-60"
        >
          {saving ? "กำลังบันทึก..." : "บันทึก PDF ลงเครื่อง"}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded border border-white/30 bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/60"
        >
          พิมพ์ (A4)
        </button>
        <button
          type="button"
          onClick={() => history.back()}
          className="rounded border border-white/30 bg-night px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/60"
        >
          กลับ
        </button>
      </div>
    </div>
  );
}
