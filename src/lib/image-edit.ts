type RefImage = { mimeType: string; data: string };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("无法读取图片像素"));
    img.src = src;
  });
}

function dist(data: Uint8ClampedArray, i: number, c: [number, number, number]) {
  const dr = data[i] - c[0];
  const dg = data[i + 1] - c[1];
  const db = data[i + 2] - c[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function isLowSaturationLight(data: Uint8ClampedArray, i: number) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max > 232 && max - min < 28;
}

function sampleCorners(data: Uint8ClampedArray, w: number, h: number): [number, number, number] {
  let r = 0, g = 0, b = 0, n = 0;
  const sample = (x0: number, y0: number) => {
    for (let y = y0; y < Math.min(h, y0 + 12); y++) {
      for (let x = x0; x < Math.min(w, x0 + 12); x++) {
        const i = (y * w + x) * 4;
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
      }
    }
  };
  sample(0, 0); sample(Math.max(0, w - 12), 0); sample(0, Math.max(0, h - 12)); sample(Math.max(0, w - 12), Math.max(0, h - 12));
  return [r / n, g / n, b / n];
}

export async function cleanupImageBackground(ref: RefImage): Promise<string> {
  const src = `data:${ref.mimeType || "image/png"};base64,${ref.data}`;
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = image;
  const w = canvas.width, h = canvas.height;
  const bg = sampleCorners(data, w, h);
  const seen = new Uint8Array(w * h);
  const q: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (seen[p]) return;
    const i = p * 4;
    if (data[i + 3] < 12 || dist(data, i, bg) < 74 || isLowSaturationLight(data, i)) {
      seen[p] = 1;
      q.push(p);
    }
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  for (let head = 0; head < q.length; head++) {
    const p = q[head];
    const x = p % w;
    const y = Math.floor(p / w);
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
  for (let p = 0; p < seen.length; p++) {
    if (!seen[p]) continue;
    data[p * 4 + 3] = 0;
  }
  // Feather a one-pixel edge so cutouts do not keep a visible pale halo.
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (seen[p]) continue;
      if (seen[p - 1] || seen[p + 1] || seen[p - w] || seen[p + w]) {
        const i = p * 4;
        if (dist(data, i, bg) < 104 || isLowSaturationLight(data, i)) data[i + 3] = Math.min(data[i + 3], 90);
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}
