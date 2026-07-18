import type { PersistedEditorState } from "@/lib/editor-storage";

const STATE_KEY = "korshinskii-image2-illustration-2026-07-16";
const STATE_BUCKET = "poster-state";
const IMAGES_BUCKET = "poster-images";
const MAX_STATE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

type StoreLike = {
  get: (key: string) => Promise<unknown>;
  put: (key: string, value: string) => Promise<unknown>;
};

export type ServerStateEnv = {
  POSTER_STATE?: StoreLike;
  ASSETS?: { fetch: (req: Request | string) => Promise<Response> };
  EDIT_KEY?: string;
  MCP_API_TOKEN?: string;
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  LOVABLE_API_KEY?: string;
  GEMINI_API_KEY?: string;
};

type SupabaseConnection = { url: string; key: string };
type ImageBlockLike = { type?: unknown; src?: unknown };

export type PublishedStateRead = {
  state: PersistedEditorState;
  source: "supabase" | "kv";
  revision: string;
};

export type PublishedStateWrite = {
  state: PersistedEditorState;
  savedAt: string;
  store: "supabase" | "kv";
  revision: string;
  externalizedImages: number;
};

export type StoredImage = {
  url: string;
  path: string;
  mime: string;
  bytes: number;
  hash: string;
};

export type StateVersion = {
  name: string;
  createdAt?: string;
  updatedAt?: string;
  bytes?: number;
};

function runtimeEnv(): Record<string, unknown> {
  const bound = (globalThis as unknown as { __env__?: Record<string, unknown> }).__env__ ?? {};
  const proc =
    typeof process !== "undefined" ? (process.env as unknown as Record<string, unknown>) : {};
  return { ...proc, ...bound };
}

export function getServerStateEnv(): ServerStateEnv {
  const env = runtimeEnv();
  return {
    POSTER_STATE: env.POSTER_STATE as StoreLike | undefined,
    ASSETS: env.ASSETS as ServerStateEnv["ASSETS"],
    EDIT_KEY: typeof env.EDIT_KEY === "string" ? env.EDIT_KEY : undefined,
    MCP_API_TOKEN: typeof env.MCP_API_TOKEN === "string" ? env.MCP_API_TOKEN : undefined,
    SUPABASE_URL: typeof env.SUPABASE_URL === "string" ? env.SUPABASE_URL : undefined,
    SUPABASE_SECRET_KEY:
      typeof env.SUPABASE_SECRET_KEY === "string" ? env.SUPABASE_SECRET_KEY : undefined,
    LOVABLE_API_KEY: typeof env.LOVABLE_API_KEY === "string" ? env.LOVABLE_API_KEY : undefined,
    GEMINI_API_KEY: typeof env.GEMINI_API_KEY === "string" ? env.GEMINI_API_KEY : undefined,
  };
}

function getSupabase(env = getServerStateEnv()): SupabaseConnection | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) return null;
  const url = env.SUPABASE_URL.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  return { url, key: env.SUPABASE_SECRET_KEY };
}

function supabaseHeaders(
  connection: SupabaseConnection,
  extra?: Record<string, string>,
): Record<string, string> {
  return {
    authorization: `Bearer ${connection.key}`,
    apikey: connection.key,
    ...extra,
  };
}

function objectUrl(connection: SupabaseConnection, bucket: string, path: string): string {
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${connection.url}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`;
}

async function downloadObject(
  connection: SupabaseConnection,
  bucket: string,
  path: string,
): Promise<string | null> {
  const response = await fetch(objectUrl(connection, bucket, path), {
    headers: supabaseHeaders(connection),
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `storage download ${bucket}/${path} failed (${response.status}): ${detail.slice(0, 200)}`,
    );
  }
  return await response.text();
}

async function uploadObject(
  connection: SupabaseConnection,
  bucket: string,
  path: string,
  body: string | Uint8Array,
  contentType: string,
): Promise<void> {
  const response = await fetch(objectUrl(connection, bucket, path), {
    method: "POST",
    headers: supabaseHeaders(connection, {
      "content-type": contentType,
      "x-upsert": "true",
    }),
    body: body as BodyInit,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `storage upload ${bucket}/${path} failed (${response.status}): ${detail.slice(0, 200)}`,
    );
  }
}

async function readStore(store: StoreLike): Promise<string | null> {
  const value = await store.get(STATE_KEY);
  if (typeof value === "string") return value;
  if (value && typeof (value as { text?: unknown }).text === "function") {
    return await (value as { text: () => Promise<string> }).text();
  }
  return null;
}

export function isPersistedEditorState(value: unknown): value is PersistedEditorState {
  const state = value as Partial<PersistedEditorState> | null;
  return (
    !!state &&
    Array.isArray(state.pages) &&
    state.pages.length > 0 &&
    typeof state.activeId === "string" &&
    !!state.palette
  );
}

function parseState(text: string, source: string): PersistedEditorState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${source} returned invalid JSON.`);
  }
  if (!isPersistedEditorState(parsed)) {
    throw new Error(`${source} returned an invalid editor state.`);
  }
  return parsed;
}

function cloneState(state: PersistedEditorState): PersistedEditorState {
  if (typeof structuredClone === "function") return structuredClone(state);
  return JSON.parse(JSON.stringify(state)) as PersistedEditorState;
}

async function digestHex(algorithm: "SHA-1" | "SHA-256", bytes: Uint8Array) {
  const digest = await crypto.subtle.digest(algorithm, bytes as BufferSource);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function stateRevision(state: PersistedEditorState): Promise<string> {
  return (await digestHex("SHA-256", new TextEncoder().encode(JSON.stringify(state)))).slice(0, 24);
}

export async function readPublishedServerState(): Promise<PublishedStateRead | null> {
  const env = getServerStateEnv();
  const supabase = getSupabase(env);
  if (supabase) {
    const text = await downloadObject(supabase, STATE_BUCKET, "latest.json");
    if (text) {
      const state = parseState(text, "Supabase latest.json");
      return { state, source: "supabase", revision: await stateRevision(state) };
    }
  }
  if (env.POSTER_STATE) {
    const text = await readStore(env.POSTER_STATE);
    if (text) {
      const state = parseState(text, "Cloudflare KV");
      return { state, source: "kv", revision: await stateRevision(state) };
    }
  }
  return null;
}

const MIME_EXTENSIONS: Record<string, string> = {
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
    if (/;base64(?:;|$)/i.test(header)) {
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index++) {
        bytes[index] = binary.charCodeAt(index);
      }
      return { bytes, mime };
    }
    return {
      bytes: new TextEncoder().encode(decodeURIComponent(payload)),
      mime,
    };
  } catch {
    return null;
  }
}

function publicObjectUrl(connection: SupabaseConnection, bucket: string, path: string): string {
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${connection.url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}

export async function storeImageDataUrl(src: string, prefix = "generated"): Promise<StoredImage> {
  const connection = getSupabase();
  if (!connection) throw new Error("Supabase Storage is not configured.");
  const decoded = decodeDataUrl(src);
  if (!decoded || !MIME_EXTENSIONS[decoded.mime]) {
    throw new Error("The image result is not a supported image data URL.");
  }
  if (decoded.bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Generated image exceeds the 6 MB direct-upload safety limit.");
  }
  const hash = await digestHex("SHA-256", decoded.bytes);
  const safePrefix =
    prefix
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .slice(0, 48) || "generated";
  const path = `mcp/${safePrefix}-${hash.slice(0, 20)}.${MIME_EXTENSIONS[decoded.mime]}`;
  await uploadObject(connection, IMAGES_BUCKET, path, decoded.bytes, decoded.mime);
  return {
    url: publicObjectUrl(connection, IMAGES_BUCKET, path),
    path,
    mime: decoded.mime,
    bytes: decoded.bytes.byteLength,
    hash,
  };
}

async function externalizeImages(
  connection: SupabaseConnection,
  state: PersistedEditorState,
): Promise<number> {
  const uploaded = new Map<string, string>();
  let count = 0;
  for (const page of state.pages) {
    for (const block of page.blocks as ImageBlockLike[]) {
      if (
        block.type !== "image" ||
        typeof block.src !== "string" ||
        !block.src.startsWith("data:")
      ) {
        continue;
      }
      const decoded = decodeDataUrl(block.src);
      if (!decoded || !MIME_EXTENSIONS[decoded.mime]) continue;
      const hash = await digestHex("SHA-256", decoded.bytes);
      const name = `${hash.slice(0, 20)}.${MIME_EXTENSIONS[decoded.mime]}`;
      let url = uploaded.get(name);
      if (!url) {
        await uploadObject(connection, IMAGES_BUCKET, name, decoded.bytes, decoded.mime);
        url = publicObjectUrl(connection, IMAGES_BUCKET, name);
        uploaded.set(name, url);
      }
      block.src = url;
      count++;
    }
  }
  return count;
}

export async function publishServerState(
  input: PersistedEditorState,
): Promise<PublishedStateWrite> {
  if (!isPersistedEditorState(input)) throw new Error("Invalid editor state.");
  const state = cloneState(input);
  const env = getServerStateEnv();
  const connection = getSupabase(env);
  if (!connection && !env.POSTER_STATE) {
    throw new Error("Global storage is not configured (Supabase and KV are unavailable).");
  }

  let externalizedImages = 0;
  if (connection) externalizedImages = await externalizeImages(connection, state);
  const body = JSON.stringify(state);
  if (new TextEncoder().encode(body).byteLength > MAX_STATE_BYTES) {
    throw new Error("Editor state exceeds the 20 MB safety limit.");
  }

  const savedAt = new Date().toISOString();
  if (connection) {
    const versionName = `${savedAt.replace(/[:.]/g, "-")}.json`;
    await uploadObject(
      connection,
      STATE_BUCKET,
      `versions/${versionName}`,
      body,
      "application/json",
    );
    await uploadObject(connection, STATE_BUCKET, "latest.json", body, "application/json");

    const sideWrites: Promise<void>[] = state.pages.map((page) =>
      uploadObject(
        connection,
        STATE_BUCKET,
        `pages/${page.id}.json`,
        JSON.stringify(page),
        "application/json",
      ),
    );
    sideWrites.push(
      uploadObject(
        connection,
        STATE_BUCKET,
        "manifest.json",
        JSON.stringify({
          version: 1,
          updatedAt: savedAt,
          activeId: state.activeId,
          palette: state.palette,
          pageOrder: state.pages.map((page) => ({ id: page.id, name: page.name })),
        }),
        "application/json",
      ),
    );
    const sideResults = await Promise.allSettled(sideWrites);
    for (const result of sideResults) {
      if (result.status === "rejected") console.error("state side write failed", result.reason);
    }
  }

  if (env.POSTER_STATE) {
    try {
      await env.POSTER_STATE.put(STATE_KEY, body);
    } catch (error) {
      if (!connection) throw error;
      console.error("KV mirror write failed", error);
    }
  }

  return {
    state,
    savedAt,
    store: connection ? "supabase" : "kv",
    revision: await stateRevision(state),
    externalizedImages,
  };
}

export async function listStateVersions(limit = 20): Promise<StateVersion[]> {
  const connection = getSupabase();
  if (!connection) throw new Error("Supabase Storage is not configured.");
  const response = await fetch(
    `${connection.url}/storage/v1/object/list/${encodeURIComponent(STATE_BUCKET)}`,
    {
      method: "POST",
      headers: supabaseHeaders(connection, { "content-type": "application/json" }),
      body: JSON.stringify({
        prefix: "versions",
        limit: Math.min(Math.max(limit, 1), 100),
        offset: 0,
        sortBy: { column: "created_at", order: "desc" },
      }),
    },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`storage list versions failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  const objects = (await response.json()) as Array<{
    name?: unknown;
    created_at?: unknown;
    updated_at?: unknown;
    metadata?: { size?: unknown };
  }>;
  return objects
    .filter((item) => typeof item.name === "string" && item.name.endsWith(".json"))
    .map((item) => ({
      name: item.name as string,
      ...(typeof item.created_at === "string" ? { createdAt: item.created_at } : {}),
      ...(typeof item.updated_at === "string" ? { updatedAt: item.updated_at } : {}),
      ...(typeof item.metadata?.size === "number" ? { bytes: item.metadata.size } : {}),
    }));
}

function safeVersionName(name: string): string {
  const trimmed = name.trim();
  if (!/^[A-Za-z0-9_.-]+\.json$/.test(trimmed)) {
    throw new Error("Invalid version name.");
  }
  return trimmed;
}

export async function readStateVersion(name: string): Promise<PersistedEditorState> {
  const connection = getSupabase();
  if (!connection) throw new Error("Supabase Storage is not configured.");
  const versionName = safeVersionName(name);
  const text = await downloadObject(connection, STATE_BUCKET, `versions/${versionName}`);
  if (!text) throw new Error(`Version ${versionName} was not found.`);
  return parseState(text, `Version ${versionName}`);
}

export async function restoreStateVersion(name: string): Promise<PublishedStateWrite> {
  return await publishServerState(await readStateVersion(name));
}
