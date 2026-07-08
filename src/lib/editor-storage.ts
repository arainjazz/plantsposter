import type { PosterPage } from "@/lib/poster-data";
import type { Palette } from "@/lib/poster-ops";

export const EDITOR_STORAGE_KEY = "banrihua.editor.v1";

export type PersistedEditorState = {
  pages: PosterPage[];
  activeId: string;
  palette: Palette;
};

const DB_NAME = "banrihua-editor";
const STORE = "state";
const RECORD = "latest";

function isState(value: unknown): value is PersistedEditorState {
  const v = value as PersistedEditorState | null;
  return (
    !!v &&
    Array.isArray(v.pages) &&
    v.pages.length > 0 &&
    typeof v.activeId === "string" &&
    !!v.palette
  );
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

async function readIndexedDb(): Promise<PersistedEditorState | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(RECORD);
    req.onsuccess = () => resolve(isState(req.result) ? req.result : null);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
    tx.oncomplete = () => db.close();
  });
}

async function writeIndexedDb(state: PersistedEditorState): Promise<void> {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB unavailable");
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(state, RECORD);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("IndexedDB write failed"));
    };
  });
}

function readLocalStorage(): PersistedEditorState | null {
  try {
    const raw = localStorage.getItem(EDITOR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function loadEditorState(): Promise<PersistedEditorState | null> {
  if (typeof window === "undefined") return null;
  try {
    return (await readIndexedDb()) ?? readLocalStorage();
  } catch {
    return readLocalStorage();
  }
}

export async function saveEditorState(state: PersistedEditorState): Promise<void> {
  try {
    await writeIndexedDb(state);
  } catch (idbError) {
    try {
      localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(state));
      return;
    } catch {
      throw idbError;
    }
  }
  try {
    localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // IndexedDB is the durable store; localStorage is a small synchronous fallback.
  }
}

export async function clearEditorState(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(RECORD);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch { /* ignore */ }
  try { localStorage.removeItem(EDITOR_STORAGE_KEY); } catch { /* ignore */ }
}

// ── Global published state (shared by all visitors, stored in R2) ─────────

// Fetch the globally published state from the server (/api/state).
// Returns null on any failure so callers can fall back to local/default.
export async function loadPublishedState(): Promise<PersistedEditorState | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/state?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    return isState(data) ? (data as PersistedEditorState) : null;
  } catch {
    return null;
  }
}

// Publish the current state globally so every visitor sees it. POSTs to
// /api/state, which writes to R2. Throws with a readable message on failure.
export async function publishEditorState(
  state: PersistedEditorState,
  editKey?: string,
): Promise<void> {
  const res = await fetch("/api/state", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(editKey ? { "x-edit-key": editKey } : {}),
    },
    body: JSON.stringify(state),
  });
  if (!res.ok) {
    let msg = `发布失败 (${res.status})`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
}

export function downloadEditorStateFile(state: PersistedEditorState) {
  const blob = new Blob([JSON.stringify({ version: 1, ...state }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `banrihua-editor-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function parseEditorStateFile(file: File): Promise<PersistedEditorState> {
  const parsed = JSON.parse(await file.text()) as unknown;
  if (isState(parsed)) return parsed;
  const wrapped = parsed as { pages?: unknown; activeId?: unknown; palette?: unknown };
  if (isState({ pages: wrapped.pages, activeId: wrapped.activeId, palette: wrapped.palette })) {
    return {
      pages: wrapped.pages as PosterPage[],
      activeId: wrapped.activeId as string,
      palette: wrapped.palette as Palette,
    };
  }
  throw new Error("不是有效的半日花编辑器保存文件");
}
