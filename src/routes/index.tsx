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
import { INITIAL_BLOCKS, POSTER_H, POSTER_W, makeEmptyPage, clonePage, deriveAutoName } from "@/lib/poster-data";
import { applyOperations, DEFAULT_PALETTE, type Operation, type Palette } from "@/lib/poster-ops";
import { composeRangeMapSVG } from "@/lib/range-map";

const STORAGE_KEY = "banrihua.editor.v1";
type PersistedState = { pages: PosterPage[]; activeId: string; palette: Palette };

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed?.pages?.length) return null;
    return parsed;
  } catch { return null; }
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "半日花 · 植物图鉴 AI 编辑器" },
      { name: "description", content: "Canva 风格的 A3 植物科普海报编辑器，支持拖动、多选、AI 编辑与多格式导出。" },
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
  } catch { return null; }
}

function Editor() {
  const [hydrated, setHydrated] = useState(false);
  const [pages, setPages] = useState<PosterPage[]>([
    { id: "page-1", name: "封面·半日花", autoName: false, blocks: INITIAL_BLOCKS },
  ]);
  const [activeId, setActiveId] = useState<string>("page-1");
  const [palette, setPalette] = useState<Palette>(DEFAULT_PALETTE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const stageRef = useRef<HTMLDivElement>(null);
  const [displayWidth, setDisplayWidth] = useState(600);

  // Load persisted state once on mount (client only, so SSR stays deterministic).
  useEffect(() => {
    const p = loadPersisted();
    if (p) {
      setPages(p.pages);
      setActiveId(p.activeId);
      setPalette(p.palette);
    }
    setHydrated(true);
  }, []);

  // Persist on every change (after hydration to avoid overwriting with defaults).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ pages, activeId, palette }));
    } catch { /* quota exceeded — silently ignore */ }
  }, [hydrated, pages, activeId, palette]);

  // context menu + search modal
  const [ctxMenu, setCtxMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [searchFor, setSearchFor] = useState<string | null>(null);
  const [busyMsg, setBusyMsg] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
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

  const updateActiveBlocks = useCallback((mapFn: (bs: Block[]) => Block[]) => {
    setPages((prev) => prev.map((p) => (p.id === activeId ? { ...p, blocks: mapFn(p.blocks) } : p)));
  }, [activeId]);

  function patchSelected(patch: Partial<TextBlock>) {
    if (!soloSelected) return;
    const id = soloSelected.id;
    updateActiveBlocks((bs) => bs.map((b) => (b.id === id && b.type === "text" ? { ...b, ...patch } : b)));
  }
  const setImageAt = useCallback((id: string, src: string | null) => {
    updateActiveBlocks((bs) => bs.map((b) => (b.id === id && b.type === "image" ? ({ ...(b as ImageBlock), src }) : b)));
  }, [updateActiveBlocks]);
  function setImage(src: string | null) {
    if (!soloSelected || soloSelected.type !== "image") return;
    setImageAt(soloSelected.id, src);
  }
  function moveMany(dx: number, dy: number) {
    if (selectedIds.size === 0) return;
    updateActiveBlocks((bs) => bs.map((b) => selectedIds.has(b.id) ? { ...b, x: b.x + dx, y: b.y + dy } : b));
  }
  function resizeBlock(id: string, patch: { x: number; y: number; w: number; h?: number }) {
    updateActiveBlocks((bs) =>
      bs.map((b) => {
        if (b.id !== id) return b;
        if (b.type === "image") return { ...b, x: patch.x, y: patch.y, w: patch.w, h: patch.h ?? b.h };
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
  function selectIds(ids: string[]) { setSelectedIds(new Set(ids)); }

  // Auto-rename
  useEffect(() => {
    if (!activePage.autoName) return;
    const suggested = deriveAutoName(activePage.blocks);
    if (suggested && suggested !== activePage.name) {
      setPages((prev) => prev.map((p) => (p.id === activePage.id ? { ...p, name: suggested } : p)));
    }
  }, [activePage.blocks, activePage.autoName, activePage.id, activePage.name]);

  // Delete key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
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
  }
  function deletePage(id: string) {
    setPages((prev) => {
      const out = prev.filter((p) => p.id !== id);
      if (id === activeId && out.length > 0) setActiveId(out[0].id);
      return out;
    });
    setSelectedIds(new Set());
  }
  function renamePage(id: string, name: string) {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, name, autoName: false } : p)));
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
    setBusyMsg("正在去除背景（AI）...");
    try {
      const ref = await urlToBase64(block.src);
      if (!ref) { setBusyMsg(null); alert("无法读取图像"); return; }
      const r = await fetch("/api/gen-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Remove the background completely. Output ONLY the main subject on a fully transparent background. Preserve fine edges, hair, and leaf detail. PNG with alpha channel.",
          reference: ref,
        }),
      });
      const j = await r.json() as { dataUrl?: string; error?: string };
      if (j.dataUrl) setImageAt(id, j.dataUrl);
      else alert(j.error || "去背景失败");
    } catch (e) {
      alert(e instanceof Error ? e.message : "去背景失败");
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
    function onUp() { dragRef.current = null; document.body.style.cursor = ""; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);
  function startDrag(side: "left" | "right", e: React.MouseEvent) {
    dragRef.current = { side, startX: e.clientX, startW: side === "left" ? leftW : rightW };
    document.body.style.cursor = "col-resize";
  }

  // ── clipboard: copy/paste blocks (⌘/Ctrl + C/V) ─────────
  const clipboardRef = useRef<Block[]>([]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      const meta = e.metaKey || e.ctrlKey;
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
      <header style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", padding: "0 20px", background: "white", borderBottom: "1px solid #e5e5e5", gap: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>🌾 Ordos Plantspedia · Editor</div>
        <div style={{ color: "#888", fontSize: 12 }}>
          A3 竖版 ｜ {pages.length} 页 ｜ 已选 {selectedIds.size} · Del删除 · ⌘/Ctrl 多选 · ⌘/Ctrl+C/V 复制粘贴
        </div>
        <div style={{ marginLeft: "auto" }}>
          <ExportMenu pages={pages} activePageId={activeId} palette={palette} />
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
        style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", overflow: "auto", padding: 24 }}
      >
        <PosterCanvas
          blocks={blocks}
          palette={palette}
          selectedIds={selectedIds}
          onSelectIds={selectIds}
          onMoveMany={moveMany}
          onResize={resizeBlock}
          onResizeMany={resizeMany}
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
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #eee", fontSize: 13, fontWeight: 600 }}>
          属性面板 {selectedIds.size > 1 ? `（已选 ${selectedIds.size} 个，仅显示单选属性）` : ""}
        </div>
        <Inspector
          block={soloSelected}
          background={palette.background}
          onChange={patchSelected}
          onChangeImage={setImage}
          onChangeBackground={(c) => setPalette((p) => ({ ...p, background: c }))}
        />
      </aside>

      <div style={{ gridColumn: "1 / -1" }}>
        <PageTabs
          pages={pages}
          activeId={activeId}
          onSelect={(id) => { setActiveId(id); setSelectedIds(new Set()); }}
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

      {ctxMenu && (() => {
        const b = blocks.find((x) => x.id === ctxMenu.id);
        const hasImage = b?.type === "image" && !!b.src;
        return (
          <BlockContextMenu
            x={ctxMenu.x} y={ctxMenu.y}
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
          initialQuery={(blocks.find((b) => b.id === searchFor) as ImageBlock | undefined)?.label ?? ""}
          onClose={() => setSearchFor(null)}
          onPick={(url) => { setImageAt(searchFor, url); setSearchFor(null); }}
        />
      )}

      {busyMsg && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200,
          color: "white", fontSize: 15,
        }}>
          {busyMsg}
        </div>
      )}
    </div>
  );
}
