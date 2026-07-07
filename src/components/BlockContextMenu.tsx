import { useEffect, useRef } from "react";

type Props = {
  x: number;
  y: number;
  onClose: () => void;
  onUpload: () => void;
  onSearch: () => void;
  onRemoveBg: () => void;
  onClear: () => void;
  hasImage: boolean;
};

export function BlockContextMenu({
  x,
  y,
  onClose,
  onUpload,
  onSearch,
  onRemoveBg,
  onClear,
  hasImage,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    window.addEventListener("mousedown", handler);
    window.addEventListener("scroll", onClose, true);
    return () => {
      window.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 1000,
        background: "white",
        border: "1px solid #e5e5e5",
        borderRadius: 8,
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
        padding: 4,
        minWidth: 200,
        fontSize: 13,
      }}
    >
      <Item
        label="📁  本地上传替换"
        onClick={() => {
          onUpload();
          onClose();
        }}
      />
      <Item
        label="🔍  搜索图片替换"
        onClick={() => {
          onSearch();
          onClose();
        }}
      />
      <Item
        label="✂️  一键去背景（AI）"
        onClick={() => {
          onRemoveBg();
          onClose();
        }}
        disabled={!hasImage}
      />
      <div style={{ height: 1, background: "#eee", margin: "4px 0" }} />
      <Item
        label="🗑  清除图片"
        onClick={() => {
          onClear();
          onClose();
        }}
        disabled={!hasImage}
      />
    </div>
  );
}

function Item({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "8px 10px",
        border: "none",
        background: "transparent",
        borderRadius: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        color: disabled ? "#bbb" : "#222",
        fontSize: 13,
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = "#f4f4f4";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      {label}
    </button>
  );
}
