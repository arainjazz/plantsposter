import type { Block } from "@/lib/poster-data";
import { useState } from "react";

type Props = {
  blocks: Block[];
  selectedIds: Set<string>;
  onSelectIds: (ids: string[]) => void;
  onReorderBlocks: (newBlocks: Block[]) => void;
};

export function LayersPanel({ blocks, selectedIds, onSelectIds, onReorderBlocks }: Props) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 反转顺序显示（最上层的在列表顶部）
  const displayBlocks = [...blocks].reverse();

  const getBlockLabel = (block: Block): string => {
    if (block.type === "text") {
      const text = block.text || "";
      return text.length > 30 ? text.slice(0, 30) + "..." : text || "空文本";
    }
    return block.label || "图片";
  };

  const getBlockIcon = (block: Block): string => {
    return block.type === "text" ? "T" : "🖼";
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // 因为显示顺序是反转的，需要转换回原数组的索引
    const fromIndex = blocks.length - 1 - draggedIndex;
    const toIndex = blocks.length - 1 - dropIndex;

    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, movedBlock);

    onReorderBlocks(newBlocks);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const moveLayer = (id: string, direction: "up" | "down" | "top" | "bottom") => {
    const currentIndex = blocks.findIndex((b) => b.id === id);
    if (currentIndex === -1) return;

    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(currentIndex, 1);

    let newIndex: number;
    switch (direction) {
      case "up":
        newIndex = Math.min(currentIndex + 1, blocks.length);
        break;
      case "down":
        newIndex = Math.max(currentIndex - 1, 0);
        break;
      case "top":
        newIndex = blocks.length;
        break;
      case "bottom":
        newIndex = 0;
        break;
    }

    newBlocks.splice(newIndex, 0, movedBlock);
    onReorderBlocks(newBlocks);
  };

  const handleLayerClick = (block: Block, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      // 多选模式
      const newSelected = new Set(selectedIds);
      if (newSelected.has(block.id)) {
        newSelected.delete(block.id);
      } else {
        newSelected.add(block.id);
      }
      onSelectIds(Array.from(newSelected));
    } else {
      // 单选模式
      onSelectIds([block.id]);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "white" }}>
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid #eee",
          fontSize: 13,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>图层 · {blocks.length}</span>
        <span style={{ fontSize: 11, color: "#999", fontWeight: 400 }}>可拖拽排序</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        {displayBlocks.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#999", fontSize: 12 }}>
            暂无图层
          </div>
        ) : (
          displayBlocks.map((block, displayIndex) => {
            const isSelected = selectedIds.has(block.id);
            const isDragging = draggedIndex === displayIndex;
            const isDropTarget = dragOverIndex === displayIndex;
            const actualIndex = blocks.length - 1 - displayIndex;

            return (
              <div
                key={block.id}
                draggable
                onDragStart={(e) => handleDragStart(e, displayIndex)}
                onDragOver={(e) => handleDragOver(e, displayIndex)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, displayIndex)}
                onDragEnd={handleDragEnd}
                onClick={(e) => handleLayerClick(block, e)}
                style={{
                  padding: "8px 10px",
                  marginBottom: "4px",
                  borderRadius: 4,
                  border: isSelected ? "2px solid #2a2622" : "1px solid #e0e0e0",
                  background: isDragging ? "#f0f0f0" : isSelected ? "#f7f5f0" : "white",
                  cursor: "pointer",
                  opacity: isDragging ? 0.5 : 1,
                  borderTop: isDropTarget ? "2px solid #2a2622" : undefined,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.1s ease",
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    width: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: block.type === "text" ? "#e3f2fd" : "#fff3e0",
                    borderRadius: 4,
                    flexShrink: 0,
                  }}
                >
                  {getBlockIcon(block)}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: isSelected ? 600 : 400,
                      color: "#333",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {getBlockLabel(block)}
                  </div>
                  <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>
                    {block.type === "text" ? "文本" : "图片"} · {block.id.slice(0, 8)}
                  </div>
                </div>

                {isSelected && (
                  <div
                    style={{
                      display: "flex",
                      gap: 2,
                      flexShrink: 0,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => moveLayer(block.id, "top")}
                      disabled={actualIndex === blocks.length - 1}
                      style={layerBtn}
                      title="置于顶层"
                    >
                      ⤒
                    </button>
                    <button
                      onClick={() => moveLayer(block.id, "up")}
                      disabled={actualIndex === blocks.length - 1}
                      style={layerBtn}
                      title="上移一层"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveLayer(block.id, "down")}
                      disabled={actualIndex === 0}
                      style={layerBtn}
                      title="下移一层"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => moveLayer(block.id, "bottom")}
                      disabled={actualIndex === 0}
                      style={layerBtn}
                      title="置于底层"
                    >
                      ⤓
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          padding: "10px 14px",
          borderTop: "1px solid #eee",
          fontSize: 11,
          color: "#888",
          lineHeight: 1.5,
        }}
      >
        提示：⌘/Ctrl+点击 多选图层
        <br />
        拖拽图层可调整上下顺序
      </div>
    </div>
  );
}

const layerBtn: React.CSSProperties = {
  width: 24,
  height: 24,
  padding: 0,
  border: "1px solid #d0d0d0",
  background: "white",
  borderRadius: 3,
  cursor: "pointer",
  fontSize: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.15s ease",
};
