"use client";

import { useState } from "react";

const ACTIONS = [
  { code: "advise", label: "การสอนแนะ", hasDeadline: false },
  { code: "gooddeeds", label: "ให้ทำความดีเพื่อชดใช้ความผิด", hasDeadline: true },
  { code: "work", label: "ให้ช่วยงานตามความสามารถ", hasDeadline: true },
  { code: "counsel", label: "ให้เข้าพบงานปรึกษาแนะแนว", hasDeadline: false },
];

export default function CorrectionActionsPicker({
  defaultDate,
}: {
  defaultDate: string;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  function toggle(code: string) {
    setChecked((prev) => ({ ...prev, [code]: !prev[code] }));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ACTIONS.map((action) => {
        const isChecked = Boolean(checked[action.code]);
        return (
          <div key={action.code}>
            <label className="cursor-pointer">
              <input
                type="checkbox"
                name="actions"
                value={action.code}
                checked={isChecked}
                onChange={() => toggle(action.code)}
                className="peer sr-only"
              />
              <span
                className={`flex items-center gap-2 rounded border px-4 py-2.5 text-sm font-medium transition ${
                  isChecked
                    ? "border-signal bg-signal/15 text-signal"
                    : "border-line text-steel hover:border-steel"
                }`}
              >
                {action.label}
              </span>
            </label>
            {isChecked && action.hasDeadline && (
              <div className="mt-1.5">
                <label className="mb-1 block text-xs font-semibold text-steel">
                  กำหนดเสร็จภายใน (วันเดือนปีที่ครบกำหนด) *
                </label>
                <input
                  type="date"
                  name={`deadline_${action.code}`}
                  required
                  defaultValue={defaultDate}
                  className="w-full rounded border border-line bg-night px-3 py-2 text-sm text-white focus:border-signal focus:outline-none"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
