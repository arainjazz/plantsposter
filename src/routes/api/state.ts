import { createFileRoute } from "@tanstack/react-router";

import {
  getServerStateEnv,
  isPersistedEditorState,
  publishServerState,
  readPublishedServerState,
} from "@/lib/published-state.server";

const SEED_ASSET = "/banrihua-editor-20plants.json";
const MAX_BYTES = 20 * 1024 * 1024;

const noStore = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
};

export const Route = createFileRoute("/api/state")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const published = await readPublishedServerState();
          if (published) {
            return new Response(JSON.stringify(published.state), { headers: noStore });
          }
        } catch (error) {
          console.error(
            "published state read failed:",
            error instanceof Error ? error.message : String(error),
          );
        }

        const env = getServerStateEnv();
        try {
          const seedUrl = new URL(SEED_ASSET, request.url).toString();
          const response = env.ASSETS ? await env.ASSETS.fetch(seedUrl) : await fetch(seedUrl);
          if (response.ok) {
            return new Response(await response.text(), { headers: noStore });
          }
        } catch (error) {
          console.error(
            "seed fetch failed:",
            error instanceof Error ? error.message : String(error),
          );
        }
        return Response.json({ error: "no state available" }, { status: 404 });
      },

      POST: async ({ request }) => {
        const env = getServerStateEnv();
        if (env.EDIT_KEY) {
          const key = request.headers.get("x-edit-key");
          if (key !== env.EDIT_KEY) {
            return Response.json({ error: "编辑密钥不正确，无权发布。" }, { status: 403 });
          }
        }

        const body = await request.text();
        if (new TextEncoder().encode(body).byteLength > MAX_BYTES) {
          return Response.json({ error: "状态过大，超过 20MB 限制。" }, { status: 413 });
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(body);
        } catch {
          return Response.json({ error: "不是有效的 JSON。" }, { status: 400 });
        }
        if (!isPersistedEditorState(parsed)) {
          return Response.json({ error: "不是有效的编辑器状态。" }, { status: 400 });
        }

        try {
          const result = await publishServerState(parsed);
          return Response.json(
            {
              ok: true,
              savedAt: result.savedAt,
              store: result.store,
              revision: result.revision,
              externalizedImages: result.externalizedImages,
            },
            { headers: noStore },
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const status = /not configured|unavailable/i.test(message) ? 501 : 500;
          return Response.json({ error: `写入失败：${message}` }, { status });
        }
      },
    },
  },
});
