import { createFileRoute } from "@tanstack/react-router";

// Global poster state persistence.
//
// GET  /api/state → returns the published poster state as JSON.
//   Source of truth: Cloudflare R2 bucket (binding POSTER_STATE), key "latest".
//   Fallback when R2 is empty or unbound: the static seed file
//   /banrihua-editor-20plants.json (bundled full state with images).
//
// POST /api/state → writes the given state to R2 (the "立即保存 / 全局发布" action).
//   All visitors then see it on their next load. Requires R2 to be bound.
//   Optional protection: if env EDIT_KEY is set, requests must send a matching
//   `x-edit-key` header; otherwise writes are open (matching the app's prior
//   no-auth design).

const R2_KEY = "latest";
const SEED_ASSET = "/banrihua-editor-20plants.json";
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB safety cap

type CfEnv = {
  POSTER_STATE?: R2BucketLike;
  ASSETS?: { fetch: (req: Request | string) => Promise<Response> };
  EDIT_KEY?: string;
};

type R2BucketLike = {
  get: (key: string) => Promise<{ body: ReadableStream | null; text: () => Promise<string> } | null>;
  put: (key: string, value: string) => Promise<unknown>;
};

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
        // 1) Prefer R2 published state.
        if (env.POSTER_STATE) {
          try {
            const obj = await env.POSTER_STATE.get(R2_KEY);
            if (obj) {
              const text = await obj.text();
              return new Response(text, { headers: noStore });
            }
          } catch (e) {
            console.error("R2 get failed:", e instanceof Error ? e.message : String(e));
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
            { error: "全局存储(R2)未配置，无法发布。请先在 Cloudflare 绑定 POSTER_STATE 存储桶。" },
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
          await env.POSTER_STATE.put(R2_KEY, body);
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
