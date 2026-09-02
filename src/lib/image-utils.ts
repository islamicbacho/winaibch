export function photoThumbUrl(driveId: string, sz = 480): string {
  if (!driveId) return "";
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w${sz}`;
}

export async function downscaleToDataUrl(
  file: File,
  maxSide = 640,
  quality = 0.82
): Promise<string> {
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