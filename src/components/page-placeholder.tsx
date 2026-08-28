export default function PagePlaceholder({
  title,
  milestone,
  description,
}: {
  title: string;
  milestone: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-extrabold italic tracking-tight text-white">
        {title}
        <span className="text-signal">.</span>
      </h1>
      <div className="clip-corner mt-8 border border-line bg-panel">
        <div className="hazard h-1" />
        <div className="flex flex-col items-center gap-3 p-14 text-center">
          <span className="rounded-full border border-signal/40 bg-signal/10 px-4 py-1 text-xs font-bold uppercase tracking-widest text-signal">
            {milestone}
          </span>
          <p className="text-sm text-steel">{description}</p>
          <p className="text-xs text-steel/60">โมดูลนี้จะเปิดใช้งานตามแผนการพัฒนาใน PLAN.md</p>
        </div>
      </div>
    </div>
  );
}
