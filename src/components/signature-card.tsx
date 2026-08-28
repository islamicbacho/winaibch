"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ExistingSig = {
  role: string;
  signerName: string;
  imageData: string;
  signedAt: string | Date;
};

const input =
  "w-full rounded border border-line bg-night px-3 py-2 text-sm text-white placeholder:text-steel/50 focus:border-signal focus:outline-none";

export default function SignatureCard({
  incidentId,
  role,
  label,
  existing,
}: {
  incidentId: number;
  role: string;
  label: string;
  existing?: ExistingSig;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [name, setName] = useState(existing?.signerName ?? "");
  const [editing, setEditing] = useState(!existing);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function ctx() {
    const canvas = canvasRef.current!;
    const c = canvas.getContext("2d")!;
    return { canvas, c };
  }

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const { canvas } = ctx();
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const { canvas, c } = ctx();
    canvas.setPointerCapture(e.pointerId);
    const p = pos(e);
    drawing.current = true;
    c.beginPath();
    c.moveTo(p.x, p.y);
    c.lineWidth = 2.5;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.strokeStyle = "#101820";
    setHasInk(true);
  }

  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const { c } = ctx();
    const p = pos(e);
    c.lineTo(p.x, p.y);
    c.stroke();
  }

  function endDraw() {
    drawing.current = false;
  }

  function clearPad() {
    const { canvas, c } = ctx();
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  async function save() {
    const { canvas } = ctx();
    if (!hasInk) {
      setMsg({ ok: false, text: "กรุณาเซ็นชื่อในช่องลายเซ็น" });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const res = await fetch("/api/signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId, role, signerName: name, imageData: dataUrl }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: json.error ?? "บันทึกไม่สำเร็จ" });
      } else {
        setMsg({ ok: true, text: "ลงนามเรียบร้อย" });
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" });
    } finally {
      setBusy(false);
    }
  }

  async function removeSig() {
    setBusy(true);
    setMsg(null);
    try {
      await fetch("/api/signatures", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId, role }),
      });
      setEditing(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const timeFmt = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div
      className={`clip-corner border bg-panel ${
        existing ? "border-mint/40" : "border-line"
      }`}
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <p className="text-sm font-bold text-white">{label}</p>
        {existing && (
          <span className="text-xs font-semibold text-mint">✓ ลงนามแล้ว</span>
        )}
      </div>

      <div className="space-y-3 p-4">
        {existing && !editing ? (
          <div>
            <img
              src={existing.imageData}
              alt={`ลายเซ็น${label}`}
              className="h-20 w-full rounded border border-line bg-white object-contain"
            />
            <p className="mt-2 text-sm font-semibold text-white">{existing.signerName}</p>
            <p className="text-xs text-steel">
              เมื่อ {timeFmt.format(new Date(existing.signedAt))}
            </p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-2 rounded border border-line px-3 py-1.5 text-xs font-semibold text-steel transition hover:border-signal hover:text-signal"
            >
              ลงนามใหม่
            </button>
          </div>
        ) : (
          <>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`ชื่อ-สกุล${label}`}
              className={input}
            />
            <canvas
              ref={canvasRef}
              width={520}
              height={150}
              onPointerDown={startDraw}
              onPointerMove={moveDraw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
              className="h-36 w-full cursor-crosshair touch-none rounded border border-dashed border-line bg-white"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="clip-corner bg-signal px-4 py-2 text-xs font-bold text-night transition hover:brightness-110 disabled:opacity-60"
              >
                {busy ? "กำลังบันทึก..." : "บันทึกลายเซ็น"}
              </button>
              <button
                type="button"
                onClick={clearPad}
                className="rounded border border-line px-3 py-2 text-xs font-semibold text-steel transition hover:border-white hover:text-white"
              >
                ล้าง
              </button>
              {existing && (
                <>
                  <button
                    type="button"
                    onClick={removeSig}
                    disabled={busy}
                    className="rounded border border-line px-3 py-2 text-xs font-semibold text-steel transition hover:border-alert hover:text-alert"
                  >
                    ลบลายเซ็น
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded border border-line px-3 py-2 text-xs font-semibold text-steel transition hover:border-white hover:text-white"
                  >
                    ยกเลิก
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {msg && (
          <p className={`text-xs font-medium ${msg.ok ? "text-mint" : "text-alert"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}
