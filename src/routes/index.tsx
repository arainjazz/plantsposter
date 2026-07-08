import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PosterCanvas } from "@/components/PosterCanvas";
import { Inspector } from "@/components/Inspector";
import { AiChat } from "@/components/AiChat";
import { ExportMenu } from "@/components/ExportMenu";
import { PageTabs } from "@/components/PageTabs";
import { BlockContextMenu } from "@/components/BlockContextMenu";
import { ImageSearchModal } from "@/components/ImageSearchModal";
import type { Block, TextBlock, ImageBlock, PosterPage } from "@/lib/poster-data";
import {
  INITIAL_BLOCKS,
  POSTER_H,
  POSTER_W,
  makeEmptyPage,
  clonePage,
  deriveAutoName,
} from "@/lib/poster-data";
import { applyOperations, DEFAULT_PALETTE, type Operation, type Palette } from "@/lib/poster-ops";
import { composeRangeMapSVG } from "@/lib/range-map";
import { cleanupImageBackground } from "@/lib/image-edit";
import {
  downloadEditorStateFile,
  loadEditorState,
  parseEditorStateFile,
  saveEditorState,
} from "@/lib/editor-storage";
import { importDocumentAsPage } from "@/lib/editor-import";


export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      page: typeof search.page === "string" ? search.page : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "半日花 · 植物图鉴 AI 编辑器" },
      {
        name: "description",
        content: "Canva 风格的 A3 植物科普海报编辑器，支持拖动、多选、AI 编辑与多格式导出。",
      },
      { property: "og:title", content: "半日花 · 植物图鉴 AI 编辑器" },
      { property: "og:description", content: "多页面、可拖动、AI 驱动的植物海报编辑器。" },
    ],
  }),
  component: Editor,
});

async function urlToBase64(src: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    if (src.startsWith("data:")) {
      const [meta, b64] = src.split(",");
      const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? "image/png";
      return { mimeType: mime, data: b64 };
    }
    const r = await fetch(src);
    const blob = await r.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => {
        const s = String(fr.result);
        const [meta, b64] = s.split(",");
        const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? blob.type;
        resolve({ mimeType: mime, data: b64 });
      };
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function Editor() {
  const { page: searchPage } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"loading" | "saving" | "saved" | "error">("loading");
  const [saveMessage, setSaveMessage] = useState("正在读取本地草稿…");
  const [pages, setPages] = useState<PosterPage[]>(defaultPlantsState.pages as PosterPage[]);
  const [activeId, setActiveId] = useState<string>(defaultPlantsState.activeId);
  const [palette, setPalette] = useState<Palette>(defaultPlantsState.palette as Palette);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const stageRef = useRef<HTMLDivElement>(null);
  const [displayWidth, setDisplayWidth] = useState(600);

  // Load persisted state once on mount (client only, so SSR stays deterministic).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let p = await loadEditorState();
      
      if (true) {
        try {
          // Fetch from GitHub raw content to bypass Cloudflare Worker size and static asset limitations
          const res = await fetch("https://raw.githubusercontent.com/arainjazz/plantsposter/main/public/banrihua-editor-20plants.json?t=" + Date.now());
          const fetchedState = await res.json();
          p = fetchedState as any;
        } catch (e) {
          console.error("Failed to fetch default state", e);
        }
      }

      if (cancelled) return;
      if (p) {
        setPages(p.pages);
        setActiveId(p.activeId);
        setPalette(p.palette);

        // Sync URL search param 'page' if missing
        const url = new URL(window.location.href);
        if (!url.searchParams.get("page")) {
          const activePage = p.pages.find((pg: any) => pg.id === p.activeId) ?? p.pages[0];
          if (activePage) {
            void navigate({
              search: (prev) => ({ ...prev, page: activePage.name }),
              replace: true,
            });
          }
        }
      } else {
        // No saved state, default URL sync
        const url = new URL(window.location.href);
        if (!url.searchParams.get("page")) {
          void navigate({
            search: (prev) => ({ ...prev, page: "封面·半日花" }),
            replace: true,
          });
        }
      }
      setHydrated(true);
      setSaveStatus("saved");
      setSaveMessage(p ? "已恢复并自动保存到本地" : "已启用本地自动保存");
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // Persist on every change (after hydration to avoid overwriting with defaults).
  useEffect(() => {
    if (!hydrated) return;
    setSaveStatus("saving");
    setSaveMessage("正在自动保存到本地…");
    const t = window.setTimeout(() => {
      void saveEditorState({ pages, activeId, palette })
        .then(() => {
          setSaveStatus("saved");
          setSaveMessage(`已自动保存 · ${new Date().toLocaleTimeString()}`);
        })
        .catch(() => {
          setSaveStatus("error");
          setSaveMessage("自动保存失败，可能导致刷新后丢失，请点击保存数据在本地");
        });
    }, 250);
    return () => window.clearTimeout(t);
  }, [hydrated, pages, activeId, palette]);

  // context menu + search modal
  const [ctxMenu, setCtxMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [searchFor, setSearchFor] = useState<string | null>(null);
  const [busyMsg, setBusyMsg] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const availW = el.clientWidth - 48;
      const availH = el.clientHeight - 48;
      const wByHeight = availH * (POSTER_W / POSTER_H);
      setDisplayWidth(Math.max(320, Math.min(availW, wByHeight)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const activePage = pages.find((p) => p.id === activeId) ?? pages[0];
  const blocks = activePage.blocks;

  const soloSelected = useMemo<Block | null>(() => {
    if (selectedIds.size !== 1) return null;
    const id = Array.from(selectedIds)[0];
    return blocks.find((b) => b.id === id) ?? null;
  }, [blocks, selectedIds]);

  const updateActiveBlocks = useCallback(
    (mapFn: (bs: Block[]) => Block[]) => {
      setPages((prev) =>
        prev.map((p) => (p.id === activeId ? { ...p, blocks: mapFn(p.blocks) } : p)),
      );
    },
    [activeId],
  );

  function patchSelected(patch: Partial<TextBlock>) {
    if (!soloSelected) return;
    const id = soloSelected.id;
    updateActiveBlocks((bs) =>
      bs.map((b) => (b.id === id && b.type === "text" ? { ...b, ...patch } : b)),
    );
  }
  function changeText(id: string, text: string) {
    updateActiveBlocks((bs) =>
      bs.map((b) => (b.id === id && b.type === "text" ? { ...b, text } : b)),
    );
  }
  const setImageAt = useCallback(
    (id: string, src: string | null) => {
      updateActiveBlocks((bs) =>
        bs.map((b) => (b.id === id && b.type === "image" ? { ...(b as ImageBlock), src } : b)),
      );
    },
    [updateActiveBlocks],
  );
  function setImage(src: string | null) {
    if (!soloSelected || soloSelected.type !== "image") return;
    setImageAt(soloSelected.id, src);
  }
  function moveMany(dx: number, dy: number) {
    if (selectedIds.size === 0) return;
    updateActiveBlocks((bs) =>
      bs.map((b) => (selectedIds.has(b.id) ? { ...b, x: b.x + dx, y: b.y + dy } : b)),
    );
  }
  function resizeBlock(id: string, patch: { x: number; y: number; w: number; h?: number }) {
    updateActiveBlocks((bs) =>
      bs.map((b) => {
        if (b.id !== id) return b;
        if (b.type === "image")
          return { ...b, x: patch.x, y: patch.y, w: patch.w, h: patch.h ?? b.h };
        return { ...b, x: patch.x, y: patch.y, w: patch.w };
      }),
    );
  }
  function resizeMany(patches: Array<{ id: string; x: number; y: number; w: number; h?: number }>) {
    const map = new Map(patches.map((p) => [p.id, p]));
    updateActiveBlocks((bs) =>
      bs.map((b) => {
        const p = map.get(b.id);
        if (!p) return b;
        if (b.type === "image") return { ...b, x: p.x, y: p.y, w: p.w, h: p.h ?? b.h };
        return { ...b, x: p.x, y: p.y, w: p.w };
      }),
    );
  }
  function selectIds(ids: string[]) {
    setSelectedIds(new Set(ids));
  }

  function alignToPage(dir: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") {
    if (selectedIds.size === 0) return;
    const sel = blocks.filter((b) => selectedIds.has(b.id));
    const boxH = (b: Block) => (b.type === "image" ? b.h : 40);
    let refX1 = 0,
      refX2 = POSTER_W,
      refY1 = 0,
      refY2 = POSTER_H;
    if (sel.length >= 2) {
      refX1 = Math.min(...sel.map((b) => b.x));
      refX2 = Math.max(...sel.map((b) => b.x + b.w));
      refY1 = Math.min(...sel.map((b) => b.y));
      refY2 = Math.max(...sel.map((b) => b.y + boxH(b)));
    }
    updateActiveBlocks((bs) =>
      bs.map((b) => {
        if (!selectedIds.has(b.id)) return b;
        const bh = boxH(b);
        let { x, y } = b;
        if (dir === "left") x = refX1;
        else if (dir === "right") x = refX2 - b.w;
        else if (dir === "hcenter") x = Math.round((refX1 + refX2) / 2 - b.w / 2);
        else if (dir === "top") y = refY1;
        else if (dir === "bottom") y = refY2 - bh;
        else if (dir === "vcenter") y = Math.round((refY1 + refY2) / 2 - bh / 2);
        return { ...b, x, y };
      }),
    );
  }

  function distribute(axis: "h" | "v") {
    if (selectedIds.size < 3) return;
    const sel = blocks.filter((b) => selectedIds.has(b.id));
    const boxH = (b: Block) => (b.type === "image" ? b.h : 40);
    const sorted = [...sel].sort((a, b) => (axis === "h" ? a.x - b.x : a.y - b.y));
    const first = sorted[0],
      last = sorted[sorted.length - 1];
    const gap =
      axis === "h"
        ? (last.x + last.w - first.x - sorted.reduce((s, b) => s + b.w, 0)) / (sorted.length - 1)
        : (last.y + boxH(last) - first.y - sorted.reduce((s, b) => s + boxH(b), 0)) /
          (sorted.length - 1);
    const positions = new Map<string, { x?: number; y?: number }>();
    let cursor = axis === "h" ? first.x : first.y;
    for (const b of sorted) {
      if (axis === "h") {
        positions.set(b.id, { x: Math.round(cursor) });
        cursor += b.w + gap;
      } else {
        positions.set(b.id, { y: Math.round(cursor) });
        cursor += boxH(b) + gap;
      }
    }
    updateActiveBlocks((bs) =>
      bs.map((b) => {
        const p = positions.get(b.id);
        return p ? { ...b, ...p } : b;
      }),
    );
  }

  // Auto-rename
  useEffect(() => {
    if (!activePage.autoName) return;
    const suggested = deriveAutoName(activePage.blocks);
    if (suggested && suggested !== activePage.name) {
      setPages((prev) => prev.map((p) => (p.id === activePage.id ? { ...p, name: suggested } : p)));
      void navigate({
        search: (prev) => ({ ...prev, page: suggested }),
        replace: true,
      });
    }
  }, [activePage.blocks, activePage.autoName, activePage.id, activePage.name, navigate]);

  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  // Sync URL search param 'page' -> activeId
  useEffect(() => {
    if (!hydrated) return;
    if (searchPage) {
      const matchedPage = pagesRef.current.find(
        (pg) => pg.id === searchPage || pg.name === searchPage,
      );
      if (matchedPage && matchedPage.id !== activeIdRef.current) {
        setActiveId(matchedPage.id);
        setSelectedIds(new Set());
      }
    }
  }, [searchPage, hydrated]);

  // Delete key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable)
        return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.size > 0) {
        e.preventDefault();
        updateActiveBlocks((bs) => bs.filter((b) => !selectedIds.has(b.id)));
        setSelectedIds(new Set());
      } else if (e.key === "Escape") {
        setSelectedIds(new Set());
        setCtxMenu(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, updateActiveBlocks]);

  async function apply(ops: Operation[]) {
    // Expand any set_range_map into a set_image with a freshly composed SVG data URL.
    const expanded: Operation[] = [];
    for (const op of ops) {
      if (op.type === "set_range_map") {
        try {
          const dataUrl = await composeRangeMapSVG(op.points, {
            title: op.title,
            subtitle: op.subtitle,
            source: op.source,
          });
          expanded.push({ type: "set_image", id: op.id, src: dataUrl });
        } catch (e) {
          console.error("range map compose failed", e);
        }
      } else {
        expanded.push(op);
      }
    }
    const { blocks: nb, palette: np } = applyOperations(blocks, palette, expanded);
    updateActiveBlocks(() => nb);
    setPalette(np);
  }

  // ── page ops ────────────────────────────────────────────
  function addPage() {
    const p = makeEmptyPage(`新页面 ${pages.length + 1}`);
    setPages((prev) => [...prev, p]);
    setActiveId(p.id);
    setSelectedIds(new Set());
    void navigate({
      search: (prev) => ({ ...prev, page: p.name }),
      replace: true,
    });
  }
  function duplicatePage(id: string) {
    const src = pages.find((p) => p.id === id);
    if (!src) return;
    const c = clonePage(src);
    setPages((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      const out = [...prev];
      out.splice(i + 1, 0, c);
      return out;
    });
    setActiveId(c.id);
    setSelectedIds(new Set());
    void navigate({
      search: (prev) => ({ ...prev, page: c.name }),
      replace: true,
    });
  }
  function deletePage(id: string) {
    if (pages.length <= 1) return;
    const i = pages.findIndex((p) => p.id === id);
    const nextActive = pages[i === 0 ? 1 : i - 1];
    setPages((prev) => prev.filter((p) => p.id !== id));
    if (id === activeId) {
      setActiveId(nextActive.id);
      void navigate({
        search: (prev) => ({ ...prev, page: nextActive.name }),
        replace: true,
      });
    }
    setSelectedIds(new Set());
  }
  function renamePage(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: trimmed, autoName: false } : p)),
    );
    if (id === activeId) {
      void navigate({
        search: (prev) => ({ ...prev, page: trimmed }),
        replace: true,
      });
    }
  }

  // ── image ops from context menu ─────────────────────────
  function openContextMenu(id: string, x: number, y: number) {
    setCtxMenu({ id, x, y });
  }
  function triggerUpload(id: string) {
    uploadTargetRef.current = id;
    uploadInputRef.current?.click();
  }
  async function removeBackground(id: string) {
    const block = blocks.find((b) => b.id === id);
    if (!block || block.type !== "image" || !block.src) return;
    setBusyMsg("正在去除背景并清理边缘…");
    try {
      const ref = await urlToBase64(block.src);
      if (!ref) {
        setBusyMsg(null);
        alert("无法读取图像");
        return;
      }
      const r = await fetch("/api/gen-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt:
            "Professional product cutout. Remove ALL background pixels completely, including white/gray halos, shadows, paper, table, sky, and edge spill. Output ONLY the foreground subject on fully transparent PNG alpha. Preserve botanical fine hairs, leaf edges, stems, and petals.",
          reference: ref,
        }),
      });
      const j = (await r.json()) as { dataUrl?: string; error?: string };
      if (j.dataUrl) {
        const aiRef = await urlToBase64(j.dataUrl);
        setImageAt(id, aiRef ? await cleanupImageBackground(aiRef) : j.dataUrl);
      } else {
        setImageAt(id, await cleanupImageBackground(ref));
        if (j.error) console.warn("AI background removal failed; used local cleanup", j.error);
      }
    } catch (e) {
      try {
        const ref = await urlToBase64(block.src);
        if (ref) setImageAt(id, await cleanupImageBackground(ref));
        else alert(e instanceof Error ? e.message : "去背景失败");
      } catch {
        alert(e instanceof Error ? e.message : "去背景失败");
      }
    } finally {
      setBusyMsg(null);
    }
  }

  function manualSave() {
    const state = { pages, activeId, palette };
    downloadEditorStateFile(state);
    void saveEditorState(state).catch(() => undefined);
  }

  async function handleImportFile(file: File) {
    setBusyMsg("正在导入文件…");
    try {
      if (file.name.toLowerCase().endsWith(".json")) {
        const state = await parseEditorStateFile(file);
        setPages(state.pages);
        setActiveId(state.activeId);
        setPalette(state.palette);
        setSelectedIds(new Set());
        setSaveMessage("已导入本地保存文件");
        const activePage = state.pages.find((p) => p.id === state.activeId) ?? state.pages[0];
        if (activePage) {
          void navigate({
            search: (prev) => ({ ...prev, page: activePage.name }),
            replace: true,
          });
        }
      } else {
        const result = await importDocumentAsPage(file);
        setPages((prev) => [...prev, result.page]);
        setActiveId(result.page.id);
        setSelectedIds(new Set());
        setSaveMessage(result.message);
        void navigate({
          search: (prev) => ({ ...prev, page: result.page.name }),
          replace: true,
        });
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "导入失败");
    } finally {
      setBusyMsg(null);
    }
  }

  // ── resizable side panels ────────────────────────────────
  const [leftW, setLeftW] = useState(320);
  const [rightW, setRightW] = useState(320);
  const dragRef = useRef<{ side: "left" | "right"; startX: number; startW: number } | null>(null);
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      const delta = e.clientX - d.startX;
      const w = d.side === "left" ? d.startW + delta : d.startW - delta;
      const clamped = Math.max(220, Math.min(560, w));
      if (d.side === "left") setLeftW(clamped);
      else setRightW(clamped);
    }
    function onUp() {
      dragRef.current = null;
      document.body.style.cursor = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);
  function startDrag(side: "left" | "right", e: React.MouseEvent) {
    dragRef.current = { side, startX: e.clientX, startW: side === "left" ? leftW : rightW };
    document.body.style.cursor = "col-resize";
  }

  // ── clipboard: copy/paste blocks (⌘/Ctrl + C/V) + undo (⌘/Ctrl+Z) ─────
  const clipboardRef = useRef<Block[]>([]);
  const historyRef = useRef<Array<{ pages: PosterPage[]; activeId: string; palette: Palette }>>([]);
  const skipHistoryRef = useRef(false);
  const prevSnapRef = useRef<{ pages: PosterPage[]; activeId: string; palette: Palette } | null>(
    null,
  );

  // Track history: push previous snapshot before applying a new one.
  useEffect(() => {
    if (!hydrated) {
      prevSnapRef.current = { pages, activeId, palette };
      return;
    }
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      prevSnapRef.current = { pages, activeId, palette };
      return;
    }
    if (prevSnapRef.current) {
      historyRef.current.push(prevSnapRef.current);
      if (historyRef.current.length > 100) historyRef.current.shift();
    }
    prevSnapRef.current = { pages, activeId, palette };
  }, [hydrated, pages, activeId, palette]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable)
        return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        const snap = historyRef.current.pop();
        if (snap) {
          skipHistoryRef.current = true;
          setPages(snap.pages);
          setActiveId(snap.activeId);
          setPalette(snap.palette);
          setSelectedIds(new Set());
        }
        return;
      }
      if (meta && e.key.toLowerCase() === "c" && selectedIds.size > 0) {
        e.preventDefault();
        clipboardRef.current = blocks.filter((b) => selectedIds.has(b.id)).map((b) => ({ ...b }));
      } else if (meta && e.key.toLowerCase() === "v" && clipboardRef.current.length > 0) {
        e.preventDefault();
        const now = Date.now();
        const cloned = clipboardRef.current.map((b, i) => ({
          ...b,
          id: `${b.id}-copy-${now}-${i}`,
          x: b.x + 24,
          y: b.y + 24,
        })) as Block[];
        updateActiveBlocks((bs) => [...bs, ...cloned]);
        setSelectedIds(new Set(cloned.map((b) => b.id)));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [blocks, selectedIds, updateActiveBlocks]);

  // ── one-click remove background from AiChat ─────────────
  useEffect(() => {
    function onRemove(e: Event) {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) removeBackground(id);
    }
    window.addEventListener("banrihua:remove-bg", onRemove);
    return () => window.removeEventListener("banrihua:remove-bg", onRemove);
  });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `${leftW}px 6px 1fr 6px ${rightW}px`,
        gridTemplateRows: "56px 1fr auto",
        height: "100vh",
        fontFamily: '"Noto Sans SC", "PingFang SC", "Helvetica Neue", Arial, sans-serif',
        background: "#efece5",
        color: "#222",
      }}
    >
      <header
        style={{
          gridColumn: "1 / -1",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          background: "white",
          borderBottom: "1px solid #e5e5e5",
          gap: 16,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15 }}>🌾 Ordos Plantspedia · Editor</div>
        <div style={{ color: "#888", fontSize: 12 }}>
          A3 竖版 ｜ {pages.length} 页 ｜ 已选 {selectedIds.size} · Del删除 · ⌘/Ctrl 多选 ·
          ⌘/Ctrl+C/V 复制粘贴 · ⌘/Ctrl+Z 撤销
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <ExportMenu pages={pages} activePageId={activeId} palette={palette} />
          <div
            style={{
              minWidth: 190,
              padding: "7px 10px",
              borderRadius: 6,
              border: saveStatus === "error" ? "1px solid #c93" : "1px solid #d8ddcf",
              background: saveStatus === "error" ? "#fff7df" : "#f4f7ef",
              color: saveStatus === "error" ? "#7a4b00" : "#405230",
              fontSize: 12,
            }}
          >
            {saveStatus === "saving" ? "⏳ " : saveStatus === "error" ? "⚠ " : "✓ "}
            {saveMessage}
          </div>
          <button onClick={manualSave} style={headerBtn}>
            保存数据在本地
          </button>
          <button onClick={() => importInputRef.current?.click()} style={headerBtn}>
            导入
          </button>
        </div>
      </header>

      <aside style={{ borderRight: "1px solid #e5e5e5", background: "white", overflow: "hidden" }}>
        <AiChat
          blocks={blocks}
          selectedImageId={soloSelected?.type === "image" ? soloSelected.id : null}
          onApplyOperations={apply}
        />
      </aside>

      <div
        onMouseDown={(e) => startDrag("left", e)}
        style={{ cursor: "col-resize", background: "#e5e5e5", userSelect: "none" }}
        title="拖动调整宽度"
      />

      <main
        ref={stageRef}
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          overflow: "auto",
          padding: 24,
        }}
      >
        <PosterCanvas
          blocks={blocks}
          palette={palette}
          pageBackground={pages.find(p => p.id === activeId)?.background}
          selectedIds={selectedIds}
          onSelectIds={selectIds}
          onMoveMany={moveMany}
          onResize={resizeBlock}
          onResizeMany={resizeMany}
          onChangeText={changeText}
          onImageContextMenu={openContextMenu}
          displayWidth={displayWidth}
        />
      </main>

      <div
        onMouseDown={(e) => startDrag("right", e)}
        style={{ cursor: "col-resize", background: "#e5e5e5", userSelect: "none" }}
        title="拖动调整宽度"
      />

      <aside style={{ borderLeft: "1px solid #e5e5e5", background: "white", overflowY: "auto" }}>
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid #eee",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          属性面板 {selectedIds.size > 1 ? `（已选 ${selectedIds.size} 个，仅显示单选属性）` : ""}
        </div>
        <Inspector
          block={soloSelected}
          pages={pages}
          activeId={activeId}
          background={pages.find(p => p.id === activeId)?.background ?? palette.background}
          selectionCount={selectedIds.size}
          onChange={patchSelected}
          onChangeImage={setImage}
          onChangeBackground={(c) => {
            setPages(prev => prev.map(p => p.id === activeId ? { ...p, background: c } : p));
            void saveEditorState({ pages: pages.map(p => p.id === activeId ? { ...p, background: c } : p), palette });
          }}
          onApplyBackgroundToPages={(ids, c) => {
            setPages(prev => prev.map(p => ids.includes(p.id) ? { ...p, background: c } : p));
            void saveEditorState({ pages: pages.map(p => ids.includes(p.id) ? { ...p, background: c } : p), palette });
          }}
          onAlignToPage={alignToPage}
          onDistribute={distribute}
        />
      </aside>

      <div style={{ gridColumn: "1 / -1" }}>
        <PageTabs
          pages={pages}
          activeId={activeId}
          onSelect={(id) => {
            setActiveId(id);
            setSelectedIds(new Set());
            const p = pages.find((pg) => pg.id === id);
            if (p) {
              void navigate({
                search: (prev) => ({ ...prev, page: p.name }),
                replace: true,
              });
            }
          }}
          onAdd={addPage}
          onDuplicate={duplicatePage}
          onDelete={deletePage}
          onRename={renamePage}
        />
      </div>

      {/* Hidden file input for context-menu uploads */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          const id = uploadTargetRef.current;
          e.target.value = "";
          if (!f || !id) return;
          const fr = new FileReader();
          fr.onload = () => setImageAt(id, String(fr.result));
          fr.readAsDataURL(f);
        }}
      />

      <input
        ref={importInputRef}
        type="file"
        accept=".json,.pdf,.pptx,.html,.htm,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/html"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void handleImportFile(f);
        }}
      />

      {ctxMenu &&
        (() => {
          const b = blocks.find((x) => x.id === ctxMenu.id);
          const hasImage = b?.type === "image" && !!b.src;
          return (
            <BlockContextMenu
              x={ctxMenu.x}
              y={ctxMenu.y}
              hasImage={hasImage}
              onClose={() => setCtxMenu(null)}
              onUpload={() => triggerUpload(ctxMenu.id)}
              onSearch={() => setSearchFor(ctxMenu.id)}
              onRemoveBg={() => removeBackground(ctxMenu.id)}
              onClear={() => setImageAt(ctxMenu.id, null)}
            />
          );
        })()}

      {searchFor && (
        <ImageSearchModal
          initialQuery={
            (blocks.find((b) => b.id === searchFor) as ImageBlock | undefined)?.label ?? ""
          }
          onClose={() => setSearchFor(null)}
          onPick={(url) => {
            setImageAt(searchFor, url);
            setSearchFor(null);
          }}
        />
      )}

      {busyMsg && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
            color: "white",
            fontSize: 15,
          }}
        >
          {busyMsg}
        </div>
      )}
    </div>
  );
}

const headerBtn: React.CSSProperties = {
  padding: "7px 10px",
  border: "1px solid #d9d9d9",
  background: "white",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
  whiteSpace: "nowrap",
};
