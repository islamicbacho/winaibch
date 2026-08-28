const STATUS_MAP: Record<string, { label: string; className: string }> = {
  recorded: {
    label: "บันทึกแล้ว",
    className: "border-signal/50 bg-signal/10 text-signal",
  },
  summoned: {
    label: "เชิญผู้ปกครองแล้ว (กจ.1)",
    className: "border-sky-400/50 bg-sky-400/10 text-sky-300",
  },
  agreement: {
    label: "ทำข้อตกลงแล้ว (กจ.1.1)",
    className: "border-violet-400/50 bg-violet-400/10 text-violet-300",
  },
  corrective: {
    label: "แก้ไขแล้ว (กจ.2)",
    className: "border-mint/50 bg-mint/10 text-mint",
  },
  signing: {
    label: "รอลงนาม",
    className: "border-orange-400/50 bg-orange-400/10 text-orange-300",
  },
  closed: {
    label: "ปิดเคส",
    className: "border-line bg-panel-2 text-steel",
  },
};

export function statusLabel(status: string): string {
  return STATUS_MAP[status]?.label ?? status;
}

export default function StatusBadge({ status }: { status: string }) {
  const info = STATUS_MAP[status] ?? {
    label: status,
    className: "border-line bg-panel-2 text-steel",
  };
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${info.className}`}
    >
      {info.label}
    </span>
  );
}
