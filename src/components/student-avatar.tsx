import { photoThumbUrl } from "@/lib/image-utils";

export default function StudentAvatar({
  photoDriveId,
  name,
  className = "h-10 w-10 text-sm",
}: {
  photoDriveId: string;
  name: string;
  className?: string;
}) {
  const src = photoThumbUrl(photoDriveId);
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`shrink-0 rounded-full border border-line bg-white object-cover ${className}`}
      />
    );
  }
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border border-signal/40 bg-signal/15 font-bold text-signal ${className}`}
    >
      {initial}
    </span>
  );
}