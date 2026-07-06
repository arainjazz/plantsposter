import type { PosterPage } from "@/lib/poster-data";

type Props = {
  pages: PosterPage[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
};

export function PageTabs({ pages, activeId, onSelect, onAdd, onDuplicate, onDelete, onRename }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        borderTop: "1px solid #e5e5e5",
        background: "white",
        overflowX: "auto",
      }}
    >
      {pages.map((p, i) => {
        const active = p.id === activeId;
        return (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 10px",
              borderRadius: 6,
              background: active ? "#2a2622" : "#f2efe8",
              color: active ? "white" : "#333",
              fontSize: 12,
              cursor: "pointer",
              whiteSpace: "nowrap",
              border: active ? "1px solid #2a2622" : "1px solid transparent",
            }}
          >
            <span style={{ fontSize: 10, opacity: 0.7 }}>#{i + 1}</span>
            <input
              value={p.name}
              onChange={(e) => onRename(p.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                fontSize: 12,
                width: Math.max(60, p.name.length * 8),
                outline: "none",
              }}
            />
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(p.id); }}
              title="复制此页"
              style={iconBtn(active)}
            >⧉</button>
            {pages.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm(`删除页面「${p.name}」？`)) onDelete(p.id); }}
                title="删除此页"
                style={iconBtn(active)}
              >✕</button>
            )}
          </div>
        );
      })}
      <button
        onClick={onAdd}
        style={{
          marginLeft: 4,
          padding: "6px 12px",
          background: "white",
          border: "1px dashed #bbb",
          borderRadius: 6,
          fontSize: 12,
          cursor: "pointer",
          color: "#555",
        }}
      >
        + 新建页面
      </button>
    </div>
  );
}

const iconBtn = (active: boolean): React.CSSProperties => ({
  border: "none",
  background: "transparent",
  color: active ? "rgba(255,255,255,0.7)" : "#888",
  cursor: "pointer",
  fontSize: 12,
  padding: "0 2px",
});
