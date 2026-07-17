import { createFileRoute } from "@tanstack/react-router";

// Global poster state persistence.
//
// GET  /api/state → returns the published poster state as JSON.
//   Source of truth: Supabase Storage, bucket "poster-state", object
//   "latest.json" (slim state: all images are URLs, no data: payloads).
//   Fallback 1: the POSTER_STATE binding (Cloudflare KV, transition period).
//   Fallback 2: the static seed asset /banrihua-editor-20plants.json.
//
// POST /api/state → publishes the given state (the "立即保存 / 全局发布"
//   action). Any data: URL images embedded by the editor are extracted,
//   uploaded to the public "poster-images" bucket (content-addressed by
//   SHA-1, so re-publishing the same image is a no-op) and replaced with
//   their public URL before the state is stored. Written objects:
//     poster-state/latest.json          – the assembled slim state (GET reads this)
//     poster-state/manifest.json        – page order, palette, activeId, updatedAt
//     poster-state/pages/<pageId>.json  – one object per page (for partial tooling)
//     poster-state/versions/<ts>.json   – snapshot per publish (rollback safety)
//   The KV binding is also written during the transition period so a
//   rollback of this deployment still sees fresh data.
//   Optional protection: if env EDIT_KEY is set, requests must send a
//   matching `x-edit-key` header.

const STATE_KEY = "korshinskii-image2-illustration-2026-07-16";
const SEED_ASSET = "/banrihua-editor-20plants.json";
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB safety cap
const STATE_BUCKET = "poster-state";
const IMAGES_BUCKET = "poster-images";

type StoreLike = {
  get: (key: string) => Promise<unknown>;
  put: (key: string, value: string) => Promise<unknown>;
};

type CfEnv = {
  POSTER_STATE?: StoreLike;
  ASSETS?: { fetch: (req: Request | string) => Promise<Response> };
  EDIT_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
};

type ImageBlock = { type?: unknown; src?: unknown };
type Page = { id?: unknown; name?: unknown; blocks?: unknown };
type EditorState = { pages: Page[]; activeId: string; palette: unknown };

async function readState(store: StoreLike): Promise<string | null> {
  const val = await store.get(STATE_KEY);
  if (typeof val === "string") return val; // KV
  if (val && typeof (val as { text?: unknown }).text === "function") {
    return await (val as { text: () => Promise<string> }).text(); // R2
  }
  return null;
}

function getEnv(): CfEnv {
  // Cloudflare Workers bindings are exposed on globalThis.__env__ by the
  // nitro cloudflare-module handler. process.env only carries string vars.
  const bound = ((globalThis as unknown as { __env__?: CfEnv }).__env__ ?? {}) as CfEnv;
  const proc = (typeof process !== "undefined" ? process.env : {}) as Record<string, string>;
  return {
    ...bound,
    SUPABASE_URL: bound.SUPABASE_URL ?? proc.SUPABASE_URL,
    SUPABASE_SECRET_KEY: bound.SUPABASE_SECRET_KEY ?? proc.SUPABASE_SECRET_KEY,
    EDIT_KEY: bound.EDIT_KEY ?? proc.EDIT_KEY,
  };
}

// ── Supabase Storage REST helpers ───────────────────────────────────────────

type Supa = { url: string; key: string };

function getSupabase(env: CfEnv): Supa | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) return null;
  // Tolerate a project URL pasted with the REST suffix or trailing slashes.
  const url = env.SUPABASE_URL.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  return { url, key: env.SUPABASE_SECRET_KEY };
}

function supaHeaders(sb: Supa, extra?: Record<string, string>): Record<string, string> {
  return {
    authorization: `Bearer ${sb.key}`,
    apikey: sb.key,
    ...extra,
  };
}

async function supaDownload(sb: Supa, bucket: string, path: string): Promise<string | null> {
  const res = await fetch(`${sb.url}/storage/v1/object/${bucket}/${path}`, {
    headers: supaHeaders(sb),
  });
  if (!res.ok) return null;
  return await res.text();
}

async function supaUpload(
  sb: Supa,
  bucket: string,
  path: string,
  body: string | Uint8Array,
  contentType: string,
): Promise<void> {
  const res = await fetch(`${sb.url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: supaHeaders(sb, { "content-type": contentType, "x-upsert": "true" }),
    body: body as BodyInit,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`storage upload ${bucket}/${path} failed (${res.status}): ${detail.slice(0, 200)}`);
  }
}

// ── data: URL extraction ────────────────────────────────────────────────────

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
  "image/gif": "gif",
};

function decodeDataUrl(src: string): { bytes: Uint8Array; mime: string } | null {
  const comma = src.indexOf(",");
  if (!src.startsWith("data:") || comma < 0) return null;
  const header = src.slice(5, comma);
  const mime = header.split(";")[0] || "application/octet-stream";
  const payload = src.slice(comma + 1);
  try {
    if (/;base64$/i.test(header)) {
      const bin = atob(payload);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return { bytes, mime };
    }
    return { bytes: new TextEncoder().encode(decodeURIComponent(payload)), mime };
  } catch {
    return null;
  }
}

async function sha1Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", bytes as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Upload every data: URL image in the state to the public images bucket and
// replace its src with the public URL. Mutates the state in place. Identical
// bytes always map to the same object name, so republishing is idempotent.
async function externalizeImages(sb: Supa, state: EditorState): Promise<number> {
  const uploaded = new Map<string, string>(); // hash -> public URL (this request)
  let count = 0;
  for (const page of state.pages) {
    const blocks = Array.isArray(page.blocks) ? (page.blocks as ImageBlock[]) : [];
    for (const block of blocks) {
      if (typeof block.src !== "string" || !block.src.startsWith("data:")) continue;
      const decoded = decodeDataUrl(block.src);
      if (!decoded) continue;
      const hash = (await sha1Hex(decoded.bytes)).slice(0, 16);
      const name = `${hash}.${MIME_EXT[decoded.mime] ?? "bin"}`;
      let publicUrl = uploaded.get(name);
      if (!publicUrl) {
        await supaUpload(sb, IMAGES_BUCKET, name, decoded.bytes, decoded.mime);
        publicUrl = `${sb.url}/storage/v1/object/public/${IMAGES_BUCKET}/${name}`;
        uploaded.set(name, publicUrl);
      }
      block.src = publicUrl;
      count++;
    }
  }
  return count;
}

function looksLikeState(v: unknown): v is EditorState {
  const s = v as { pages?: unknown; activeId?: unknown; palette?: unknown } | null;
  return (
    !!s &&
    Array.isArray(s.pages) &&
    s.pages.length > 0 &&
    typeof s.activeId === "string" &&
    !!s.palette
  );
}

const noStore = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
};

export const Route = createFileRoute("/api/state")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const env = getEnv();
        // 1) Primary: Supabase Storage latest.json (slim, ~0.4 MB).
        const sb = getSupabase(env);
        if (sb) {
          try {
            const text = await supaDownload(sb, STATE_BUCKET, "latest.json");
            if (text) return new Response(text, { headers: noStore });
          } catch (e) {
            console.error("supabase read failed:", e instanceof Error ? e.message : String(e));
          }
        }
        // 2) Fallback: the KV/R2 store from the pre-Supabase deployments.
        if (env.POSTER_STATE) {
          try {
            const text = await readState(env.POSTER_STATE);
            if (text) return new Response(text, { headers: noStore });
          } catch (e) {
            console.error("state read failed:", e instanceof Error ? e.message : String(e));
          }
        }
        // 3) Fallback: static seed asset (full state with images).
        try {
          const seedUrl = new URL(SEED_ASSET, request.url).toString();
          const res = env.ASSETS ? await env.ASSETS.fetch(seedUrl) : await fetch(seedUrl);
          if (res.ok) {
            const text = await res.text();
            return new Response(text, { headers: noStore });
          }
        } catch (e) {
          console.error("seed fetch failed:", e instanceof Error ? e.message : String(e));
        }
        return Response.json({ error: "no state available" }, { status: 404 });
      },

      POST: async ({ request }) => {
        const env = getEnv();
        const sb = getSupabase(env);
        if (!sb && !env.POSTER_STATE) {
          return Response.json(
            { error: "全局存储未配置（Supabase 或 KV 均不可用），无法发布。" },
            { status: 501 },
          );
        }
        if (env.EDIT_KEY) {
          const key = request.headers.get("x-edit-key");
          if (key !== env.EDIT_KEY) {
            return Response.json({ error: "编辑密钥不正确，无权发布。" }, { status: 403 });
          }
        }
        const body = await request.text();
        if (body.length > MAX_BYTES) {
          return Response.json({ error: "状态过大，超过 20MB 限制。" }, { status: 413 });
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(body);
        } catch {
          return Response.json({ error: "不是有效的 JSON。" }, { status: 400 });
        }
        if (!looksLikeState(parsed)) {
          return Response.json({ error: "不是有效的编辑器状态。" }, { status: 400 });
        }

        const savedAt = new Date().toISOString();
        let slimBody = body;

        if (sb) {
          try {
            // 1) Move embedded images out of the JSON into the public bucket.
            await externalizeImages(sb, parsed);
            slimBody = JSON.stringify(parsed);
            // 2) The object GET serves; this write must succeed for the
            //    publish to count.
            await supaUpload(sb, STATE_BUCKET, "latest.json", slimBody, "application/json");
            // 3) Best-effort side writes: per-page objects, manifest, snapshot.
            const sideWrites: Promise<void>[] = [];
            for (const page of parsed.pages) {
              if (typeof page.id !== "string") continue;
              sideWrites.push(
                supaUpload(sb, STATE_BUCKET, `pages/${page.id}.json`, JSON.stringify(page), "application/json"),
              );
            }
            sideWrites.push(
              supaUpload(
                sb,
                STATE_BUCKET,
                "manifest.json",
                JSON.stringify({
                  version: 1,
                  updatedAt: savedAt,
                  activeId: parsed.activeId,
                  palette: parsed.palette,
                  pageOrder: parsed.pages.map((p) => ({ id: p.id, name: p.name })),
                }),
                "application/json",
              ),
            );
            sideWrites.push(
              supaUpload(
                sb,
                STATE_BUCKET,
                `versions/${savedAt.replace(/[:.]/g, "-")}.json`,
                slimBody,
                "application/json",
              ),
            );
            const results = await Promise.allSettled(sideWrites);
            for (const r of results) {
              if (r.status === "rejected") console.error("side write failed:", r.reason);
            }
          } catch (e) {
            return Response.json(
              { error: `写入 Supabase 失败：${e instanceof Error ? e.message : String(e)}` },
              { status: 500 },
            );
          }
        }

        // Transition-period mirror: keep KV in sync so rolling back to the
        // previous deployment still shows current content. Remove once the
        // Supabase path has been stable for a while.
        if (env.POSTER_STATE) {
          try {
            await env.POSTER_STATE.put(STATE_KEY, slimBody);
          } catch (e) {
            if (!sb) {
              return Response.json(
                { error: `写入失败：${e instanceof Error ? e.message : String(e)}` },
                { status: 500 },
              );
            }
            console.error("kv mirror write failed:", e instanceof Error ? e.message : String(e));
          }
        }

        return Response.json({ ok: true, savedAt, store: sb ? "supabase" : "kv" }, { headers: noStore });
      },
    },
  },
});
