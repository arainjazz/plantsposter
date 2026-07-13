import type { Block, TextBlock, PosterPage } from "@/lib/poster-data";
import { useEffect, useState } from "react";

export type AlignDir = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";
export type DistributeAxis = "h" | "v";

type Props = {
  block: Block | null;
  background: string;
  pages: PosterPage[];
  activeId: string;
  selectionCount: number;
  onChange: (patch: Partial<TextBlock>) => void;
  onChangeImage: (src: string | null) => void;
  onChangeImageLabel: (label: string) => void;
  onChangeBackground: (color: string) => void;
  onApplyBackgroundToPages: (pageIds: string[], color: string) => void;
  onAlignToPage: (dir: AlignDir, mode: "page" | "selection") => void;
  onDistribute: (axis: DistributeAxis) => void;
};

export function Inspector({
  block,
  background,
  pages,
  activeId,
  selectionCount,
  onChange,
  onChangeImage,
  onChangeImageLabel,
  onChangeBackground,
  onApplyBackgroundToPages,
  onAlignToPage,
  onDistribute,
}: Props) {
  const [alignMode, setAlignMode] = useState<"page" | "selection">("page");
  const modeBtn = (m: "page" | "selection", label: string) => (
    <button
      onClick={() => setAlignMode(m)}
      disabled={m === "selection" && selectionCount < 2}
      style={{
        ...alignBtn,
        flex: 1,
        background: alignMode === m ? "#2a2622" : "white",
        color: alignMode === m ? "white" : "#333",
        opacity: m === "selection" && selectionCount < 2 ? 0.4 : 1,
      }}
      title={m === "page" ? "相对整个页面对齐" : "相对选中元素的整体外框对齐"}
    >
      {label}
    </button>
  );
  const AlignPanel = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "10px 12px",
        background: "#f7f5f0",
        borderRadius: 6,
      }}
    >
      <div style={{ fontSize: 11, color: "#666", fontWeight: 600 }}>
        对齐 · {selectionCount} 个元素
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {modeBtn("page", "对齐到页面")}
        {modeBtn("selection", "对齐到选区")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
        <button style={alignBtn} onClick={() => onAlignToPage("left", alignMode)} title="左对齐">
          ⇤
        </button>
        <button style={alignBtn} onClick={() => onAlignToPage("hcenter", alignMode)} title="水平居中">
          ⇔
        </button>
        <button style={alignBtn} onClick={() => onAlignToPage("right", alignMode)} title="右对齐">
          ⇥
        </button>
        <button style={alignBtn} onClick={() => onAlignToPage("top", alignMode)} title="顶对齐">
          ⤒
        </button>
        <button style={alignBtn} onClick={() => onAlignToPage("vcenter", alignMode)} title="垂直居中">
          ⇕
        </button>
        <button style={alignBtn} onClick={() => onAlignToPage("bottom", alignMode)} title="底对齐">
          ⤓
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 4 }}>
        <button
          style={alignBtn}
          onClick={() => onDistribute("h")}
          disabled={selectionCount < 3}
          title="水平等距（≥3）"
        >
          ↔ 水平等距
        </button>
        <button
          style={alignBtn}
          onClick={() => onDistribute("v")}
          disabled={selectionCount < 3}
          title="垂直等距（≥3）"
        >
          ↕ 垂直等距
        </button>
      </div>
      <div style={{ fontSize: 10, color: "#888" }}>
        提示：可切换「对齐到页面」或「对齐到选区外框」；等距分布需选中 ≥3 个元素。
      </div>
    </div>
  );
  if (!block) {
    return (
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {selectionCount >= 2 ? (
          <>
            <div style={{ fontSize: 12, color: "#888" }}>已选 {selectionCount} 个元素</div>
            {AlignPanel}
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, color: "#888" }}>未选中元素 · 页面属性</div>
            <BackgroundPicker value={background} onChange={onChangeBackground} />
            <ApplyBackgroundToPages 
              pages={pages} 
              activeId={activeId} 
              background={background} 
              onApply={onApplyBackgroundToPages} 
            />
            <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>
              点击画布上的任意文字或图片框可编辑其样式；
              <br />
              支持 ⌘/Ctrl+点击 多选、拖拽框选、Del 删除、⌘/Ctrl+C/V 复制粘贴、⌘/Ctrl+Z 撤销。
            </div>
          </>
        )}
      </div>
    );
  }

  if (block.type === "image") {
    return (
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 12, color: "#888" }}>图片框：{block.label}</div>
        <Field label="图片描述 / Alt（供读屏与 AI 整页编辑使用）">
          <textarea
            value={block.label}
            onChange={(e) => onChangeImageLabel(e.target.value)}
            rows={3}
            style={ta}
          />
        </Field>
        <div style={{ fontSize: 11, color: "#777", lineHeight: 1.55 }}>
          四个角拖动为等比例缩放；上下左右边框拖动为非破坏性裁切。
        </div>
        <label style={{ fontSize: 12, color: "#333" }}>
          上传替换图片
          <input
            type="file"
            accept="image/*"
            style={{ display: "block", marginTop: 6 }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const reader = new FileReader();
              reader.onload = () => onChangeImage(String(reader.result));
              reader.readAsDataURL(f);
            }}
          />
        </label>
        {block.src && (
          <button onClick={() => onChangeImage(null)} style={btn}>
            清除图片
          </button>
        )}
        {AlignPanel}
      </div>
    );
  }

  const t = block;
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 11, color: "#888" }}>ID: {t.id}</div>

      <Field label="文字内容">
        <textarea
          value={t.text}
          onChange={(e) => onChange({ text: e.target.value })}
          rows={4}
          style={ta}
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="字号">
          <input
            type="number"
            value={t.fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            style={inp}
          />
        </Field>
        <Field label="字重">
          <select
            value={t.fontWeight}
            onChange={(e) =>
              onChange({ fontWeight: Number(e.target.value) as TextBlock["fontWeight"] })
            }
            style={inp}
          >
            {[400, 500, 600, 700, 800].map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="颜色">
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="color"
            value={t.color}
            onChange={(e) => onChange({ color: e.target.value })}
            style={{ width: 40, height: 32, border: "1px solid #ddd", borderRadius: 4 }}
          />
          <input
            value={t.color}
            onChange={(e) => onChange({ color: e.target.value })}
            style={{ ...inp, flex: 1 }}
          />
        </div>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="字体">
          <select
            value={t.fontFamily ?? "sans"}
            onChange={(e) => onChange({ fontFamily: e.target.value as TextBlock["fontFamily"] })}
            style={inp}
          >
            <option value="sans">无衬线 · Noto Sans SC</option>
            <option value="serif">衬线 · Noto Serif SC</option>
            <option value="display">标题 · ZCOOL XiaoWei</option>
            <option value="kai">楷体 · Ma Shan Zheng</option>
            <option value="wenkai">霞鹜文楷 · LXGW WenKai</option>
            <option value="playfair">Playfair Display</option>
            <option value="inter">Inter</option>
            <option value="mono">JetBrains Mono</option>
          </select>
        </Field>
        <Field label="字形">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            <button
              onClick={() => onChange({ fontWeight: t.fontWeight >= 700 ? 400 : 700 })}
              style={{
                ...alignBtn,
                fontWeight: 700,
                background: t.fontWeight >= 700 ? "#2a2622" : "white",
                color: t.fontWeight >= 700 ? "white" : "#333",
              }}
              title="粗体"
            >
              B 粗体
            </button>
            <button
              onClick={() => onChange({ fontStyle: (t.fontStyle ?? "normal") === "italic" ? "normal" : "italic" })}
              style={{
                ...alignBtn,
                fontStyle: "italic",
                background: (t.fontStyle ?? "normal") === "italic" ? "#2a2622" : "white",
                color: (t.fontStyle ?? "normal") === "italic" ? "white" : "#333",
              }}
              title="斜体"
            >
              I 斜体
            </button>
          </div>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="文本对齐">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
            {(["left", "center", "right"] as const).map((a) => (
              <button
                key={a}
                onClick={() => onChange({ align: a })}
                style={{
                  ...alignBtn,
                  background: (t.align ?? "left") === a ? "#2a2622" : "white",
                  color: (t.align ?? "left") === a ? "white" : "#333",
                }}
              >
                {a === "left" ? "⯇" : a === "center" ? "≡" : "⯈"}
              </button>
            ))}
          </div>
        </Field>
        <Field label="行高">
          <input
            type="number"
            step="0.05"
            value={t.lineHeight ?? 1.4}
            onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
            style={inp}
          />
        </Field>
      </div>

      <Field label="字间距 (px)">
        <input
          type="number"
          step="0.5"
          value={t.letterSpacing ?? 0}
          onChange={(e) => onChange({ letterSpacing: Number(e.target.value) })}
          style={inp}
        />
      </Field>

      {AlignPanel}
    </div>
  );
}

const alignBtn: React.CSSProperties = {
  padding: "6px 4px",
  border: "1px solid #d9d9d9",
  background: "white",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 12,
};

function BackgroundPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [mode, setMode] = useState<"solid" | "gradient" | "transparent">("solid");
  const [c1, setC1] = useState("#f7f2e4");
  const [c2, setC2] = useState("#d7c7a6");
  const [alpha, setAlpha] = useState(100);
  const [angle, setAngle] = useState(135);

  useEffect(() => {
    if (value && value.startsWith("linear-gradient")) setMode("gradient");
    else if (value === "transparent" || value === "rgba(0,0,0,0)") setMode("transparent");
    else setMode("solid");
    const colors = value ? value.match(/#[0-9a-fA-F]{6}/g) : null;
    if (colors?.[0]) setC1(colors[0]);
    if (colors?.[1]) setC2(colors[1]);
    const rgb = value ? value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/) : null;
    if (rgb) {
      const hex = `#${Number(rgb[1]).toString(16).padStart(2, "0")}${Number(rgb[2]).toString(16).padStart(2, "0")}${Number(rgb[3]).toString(16).padStart(2, "0")}`;
      setC1(hex);
      if (rgb[4]) setAlpha(Math.round(Number(rgb[4]) * 100));
    }
    const deg = value ? value.match(/linear-gradient\(([-\d.]+)deg/) : null;
    if (deg) setAngle(Number(deg[1]));
  }, [value]);

  function emit(nextMode = mode, nextC1 = c1, nextC2 = c2, nextAlpha = alpha, nextAngle = angle) {
    if (nextMode === "transparent") onChange("rgba(0,0,0,0)");
    else if (nextMode === "gradient")
      onChange(
        `linear-gradient(${nextAngle}deg, ${hexToRgba(nextC1, nextAlpha / 100)} 0%, ${hexToRgba(nextC2, nextAlpha / 100)} 100%)`,
      );
    else onChange(hexToRgba(nextC1, nextAlpha / 100));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Field label="背景类型">
        <select
          value={mode}
          onChange={(e) => {
            const m = e.target.value as typeof mode;
            setMode(m);
            emit(m);
          }}
          style={inp}
        >
          <option value="solid">纯色</option>
          <option value="gradient">线性渐变</option>
          <option value="transparent">透明</option>
        </select>
      </Field>
      {mode !== "transparent" && (
        <>
          <Field label={mode === "gradient" ? "起始颜色" : "背景颜色"}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="color"
                value={c1}
                onChange={(e) => {
                  setC1(e.target.value);
                  emit(mode, e.target.value);
                }}
                style={swatch}
              />
              <input
                value={c1}
                onChange={(e) => {
                  setC1(e.target.value);
                  emit(mode, e.target.value);
                }}
                style={{ ...inp, flex: 1 }}
              />
            </div>
          </Field>
          {mode === "gradient" && (
            <>
              <Field label="结束颜色">
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="color"
                    value={c2}
                    onChange={(e) => {
                      setC2(e.target.value);
                      emit(mode, c1, e.target.value);
                    }}
                    style={swatch}
                  />
                  <input
                    value={c2}
                    onChange={(e) => {
                      setC2(e.target.value);
                      emit(mode, c1, e.target.value);
                    }}
                    style={{ ...inp, flex: 1 }}
                  />
                </div>
              </Field>
              <Field label={`渐变角度 ${angle}°`}>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={angle}
                  onChange={(e) => {
                    const a = Number(e.target.value);
                    setAngle(a);
                    emit(mode, c1, c2, alpha, a);
                  }}
                />
              </Field>
            </>
          )}
          <Field label={`透明度 ${alpha}%`}>
            <input
              type="range"
              min="0"
              max="100"
              value={alpha}
              onChange={(e) => {
                const a = Number(e.target.value);
                setAlpha(a);
                emit(mode, c1, c2, a);
              }}
            />
          </Field>
          <input value={value} onChange={(e) => onChange(e.target.value)} style={inp} />
        </>
      )}
    </div>
  );
}

function hexToRgba(hex: string, a: number): string {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!m) return hex;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${Math.max(0, Math.min(1, a)).toFixed(2)})`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label
      style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#555" }}
    >
      {label}
      {children}
    </label>
  );
}

const inp: React.CSSProperties = {
  border: "1px solid #d9d9d9",
  borderRadius: 4,
  padding: "6px 8px",
  fontSize: 13,
  background: "white",
  width: "100%",
  boxSizing: "border-box",
};

const swatch: React.CSSProperties = {
  width: 40,
  height: 32,
  border: "1px solid #ddd",
  borderRadius: 4,
};

const ta: React.CSSProperties = {
  ...inp,
  fontFamily: "inherit",
  resize: "vertical",
};

const btn: React.CSSProperties = {
  padding: "6px 10px",
  border: "1px solid #d9d9d9",
  background: "white",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 12,
};

function ApplyBackgroundToPages({ 
  pages, 
  activeId, 
  background, 
  onApply 
}: { 
  pages: PosterPage[]; 
  activeId: string; 
  background: string; 
  onApply: (ids: string[], bg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const otherPages = pages.filter(p => p.id !== activeId);

  if (otherPages.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "6px 12px",
          background: "#f0f0f0",
          border: "1px solid #ddd",
          borderRadius: 4,
          fontSize: 12,
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <span>应用到其他页面...</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          marginTop: 8,
          border: "1px solid #ddd",
          borderRadius: 4,
          padding: 8,
          background: "white"
        }}>
          <div style={{ maxHeight: 150, overflowY: "auto", marginBottom: 8 }}>
            {otherPages.map(p => (
              <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 4 }}>
                <input 
                  type="checkbox" 
                  checked={selectedIds.has(p.id)}
                  onChange={(e) => {
                    const next = new Set(selectedIds);
                    if (e.target.checked) next.add(p.id);
                    else next.delete(p.id);
                    setSelectedIds(next);
                  }}
                />
                {p.name || "未命名页面"}
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setSelectedIds(new Set(otherPages.map(p => p.id)))}
              style={{ flex: 1, fontSize: 11, padding: "4px", background: "#eee", border: "none", borderRadius: 4, cursor: "pointer" }}
            >
              全选
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{ flex: 1, fontSize: 11, padding: "4px", background: "#eee", border: "none", borderRadius: 4, cursor: "pointer" }}
            >
              清空
            </button>
            <button
              disabled={selectedIds.size === 0}
              onClick={() => {
                onApply(Array.from(selectedIds), background);
                setOpen(false);
                setSelectedIds(new Set());
              }}
              style={{ flex: 2, fontSize: 11, padding: "4px", background: selectedIds.size > 0 ? "#4a4a4a" : "#ccc", color: "white", border: "none", borderRadius: 4, cursor: selectedIds.size > 0 ? "pointer" : "default" }}
            >
              确定应用
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
