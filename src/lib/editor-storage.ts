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
