// Compose a "Global Distribution" map SVG on top of the Wikimedia CC0
// low-resolution world base map (viewBox 0 0 950 620, transparent bg).
// Points are projected via the regression-corrected formula:
//   x = 2.6865 * lon + 449.3127
//   y = -3.4451 * lat + 339.3522
//
// Base map file: /public/world-map.svg (fetched at compose time so we do not
// bloat the initial JS bundle with the ~85KB SVG).

export type RangePoint = {
  lat: number;
  lon: number;
  kind?: "native" | "introduced" | "unknown";
  label?: string;
};

export type RangeMapOpts = {
  title?: string; // e.g. "Helianthemum songaricum · Global Distribution"
  subtitle?: string; // e.g. "Equirectangular projection · Wikimedia CC0 base"
  source?: string; // caption line (data source, date, license)
  legendNative?: string; // default "Native · 原生分布"
  legendIntro?: string; // default "Introduced · 引入记录"
};

export function projectLonLat(lat: number, lon: number): { x: number; y: number } {
  return {
    x: 2.6865 * lon + 449.3127,
    y: -3.4451 * lat + 339.3522,
  };
}

let cachedBase: string | null = null;
async function loadBaseMap(): Promise<string> {
  if (cachedBase) return cachedBase;
  const r = await fetch("/world-map.svg");
  const text = await r.text();
  // Deterministic base: keep only country/region path geometry, strip all
  // source styling so every generated map has identical fill/stroke.
  const paths = text.match(/<path\b[\s\S]*?(?:\/>|<\/path>)/gi) ?? [];
  cachedBase = paths
    .map((path) =>
      path
        .replace(
          /\s(?:style|fill|stroke|stroke-width|stroke-dasharray|stroke-linejoin|stroke-linecap|opacity|(?:inkscape|sodipodi):[\w-]+)="[^"]*"/gi,
          "",
        )
        .replace(/\s+\/?>$/, (end) => (end.includes("/") ? "/>" : ">")),
    )
    .join("\n");
  return cachedBase;
}

export async function composeRangeMapSVG(
  points: RangePoint[],
  opts: RangeMapOpts = {},
): Promise<string> {
  const base = await loadBaseMap();
  const title = opts.title ?? "Global Distribution";
  const subtitle =
    opts.subtitle ?? "Wikimedia CC0 low-resolution base · Equirectangular projection";
  const source = opts.source ?? "Base map: Wikimedia Commons (World map - low resolution.svg, CC0)";
  const legendNative = opts.legendNative ?? "Native · 原生分布";
  const legendIntro = opts.legendIntro ?? "Introduced · 引入记录";

  const nativePts: string[] = [];
  const introPts: string[] = [];
  const unknownPts: string[] = [];
  for (const p of points) {
    const { x, y } = projectLonLat(p.lat, p.lon);
    const c = `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4.2" stroke="#fff" stroke-width="0.7" opacity="0.92"/>`;
    if (p.kind === "introduced") introPts.push(c.replace("<circle", '<circle fill="#d97706"'));
    else if (p.kind === "native") nativePts.push(c.replace("<circle", '<circle fill="#3a7d2e"'));
    else unknownPts.push(c.replace("<circle", '<circle fill="#64748b"'));
  }

  // total canvas 950 x 780 (620 map + 160 caption strip)
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 950 780" width="950" height="780">
  <style>
    .ttl { font: 700 22px "Noto Sans SC","PingFang SC",Arial,sans-serif; fill:#2a2622; }
    .sub { font: 400 12px "Noto Sans SC","PingFang SC",Arial,sans-serif; fill:#6b6357; }
    .cap { font: 400 12px "Noto Sans SC","PingFang SC",Arial,sans-serif; fill:#4a443c; }
    .lg  { font: 500 13px "Noto Sans SC","PingFang SC",Arial,sans-serif; fill:#2a2622; }
  </style>
  <!-- transparent background: no rect fill on the root -->
  <g id="basemap" fill="#e8dcc4" stroke="#8a7a5a" stroke-width="0.35">
    ${base}
  </g>
  <!-- graticule -->
  <g stroke="#b9a87e" stroke-width="0.55" stroke-dasharray="2 3" opacity="0.35" fill="none">
    <line x1="0" y1="339.35" x2="950" y2="339.35"/>
    <line x1="0" y1="258.61" x2="950" y2="258.61"/>
    <line x1="0" y1="420.09" x2="950" y2="420.09"/>
  </g>
  <g id="introduced-points">${introPts.join("")}</g>
  <g id="unknown-points">${unknownPts.join("")}</g>
  <g id="native-points">${nativePts.join("")}</g>

  <!-- caption strip -->
  <g transform="translate(0,640)">
    <text class="ttl" x="24" y="26">${escapeXml(title)}</text>
    <text class="sub" x="24" y="46">${escapeXml(subtitle)}</text>

    <g transform="translate(24,70)">
      <circle cx="8" cy="8" r="6" fill="#3a7d2e" stroke="#fff" stroke-width="0.8"/>
      <text class="lg" x="24" y="12">${escapeXml(legendNative)}</text>
      <circle cx="220" cy="8" r="6" fill="#d97706" stroke="#fff" stroke-width="0.8"/>
      <text class="lg" x="236" y="12">${escapeXml(legendIntro)}</text>
      <circle cx="440" cy="8" r="6" fill="#64748b" stroke="#fff" stroke-width="0.8"/>
      <text class="lg" x="456" y="12">Status unknown · 属性未定</text>
    </g>

    <text class="cap" x="24" y="118">${escapeXml(source)}</text>
    <text class="cap" x="24" y="136">Points projected with: x = 2.6865·lon + 449.3127 ,  y = -3.4451·lat + 339.3522</text>
  </g>
</svg>`;

  // btoa cannot handle non-latin1; encode UTF-8 safely
  const b64 =
    typeof window === "undefined"
      ? Buffer.from(svg, "utf8").toString("base64")
      : btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${b64}`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === '"' ? "&quot;" : "&apos;",
  );
}
