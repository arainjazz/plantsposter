import { createFileRoute } from "@tanstack/react-router";

// Global poster state persistence.
//
// GET  /api/state → returns the published poster state as JSON.
//   Source of truth: the POSTER_STATE binding (Cloudflare KV namespace), key
//   "latest". Fallback when it is empty or unbound: the static seed file
//   /banrihua-editor-20plants.json (bundled full state with images).
//
// POST /api/state → writes the given state to the store (the "立即保存 / 全局
//   发布" action). All visitors then see it on their next load. Requires the
//   POSTER_STATE binding. Optional protection: if env EDIT_KEY is set, requests
//   must send a matching `x-edit-key` header; otherwise writes are open
//   (matching the app's prior no-auth design).
//
// The reader is duck-typed so it works whether POSTER_STATE is a KV namespace
// (get() → string) or an R2 bucket (get() → object with .text()).

// A previous published draft was stored under "latest" in Cloudflare KV and
// takes precedence over bundled data.  This revision deliberately begins a
// fresh publication channel so the audited, collision-checked posters ship
// instead of that stale draft.  Subsequent editor saves stay on this key.
const STATE_KEY = "audited-2026-07-13";
const SEED_ASSET = "/banrihua-editor-20plants.json";
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB safety cap

type StoreLike = {
  get: (key: string) => Promise<unknown>;
  put: (key: string, value: string) => Promise<unknown>;
};

type CfEnv = {
  POSTER_STATE?: StoreLike;
  ASSETS?: { fetch: (req: Request | string) => Promise<Response> };
  EDIT_KEY?: string;
};

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
  return ((globalThis as unknown as { __env__?: CfEnv }).__env__ ?? {}) as CfEnv;
}

function looksLikeState(v: unknown): boolean {
  const s = v as { pages?: unknown; activeId?: unknown; palette?: unknown } | null;
  return !!s && Array.isArray(s.pages) && s.pages.length > 0 && typeof s.activeId === "string" && !!s.palette;
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
        // 1) Prefer the published state from the KV/R2 store.
        if (env.POSTER_STATE) {
          try {
            const text = await readState(env.POSTER_STATE);
            if (text) return new Response(text, { headers: noStore });
          } catch (e) {
            console.error("state read failed:", e instanceof Error ? e.message : String(e));
          }
        }
        // 2) Fallback: static seed asset (full state with images).
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
        if (!env.POSTER_STATE) {
          return Response.json(
            { error: "全局存储(KV)未配置，无法发布。请先绑定 POSTER_STATE 命名空间。" },
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
        try {
          await env.POSTER_STATE.put(STATE_KEY, body);
        } catch (e) {
          return Response.json(
            { error: `写入失败：${e instanceof Error ? e.message : String(e)}` },
            { status: 500 },
          );
        }
        return Response.json({ ok: true, savedAt: new Date().toISOString() }, { headers: noStore });
      },
    },
  },
});
