import type { Block, TextBlock } from "@/lib/poster-data";

type Props = {
  block: Block | null;
  onChange: (patch: Partial<TextBlock>) => void;
  onChangeImage: (src: string | null) => void;
};

export function Inspector({ block, onChange, onChangeImage }: Props) {
  if (!block) {
    return (
      <div style={{ padding: 16, color: "#888", fontSize: 13 }}>
        点击海报上的任意文字或图片框，在这里调整样式；或使用左下方 AI 侧栏发指令。
      </div>
    );
  }

  if (block.type === "image") {
    return (
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 12, color: "#888" }}>图片框：{block.label}</div>
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
          <button
            onClick={() => onChangeImage(null)}
            style={btn}
          >
            清除图片
          </button>
        )}
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
            onChange={(e) => onChange({ fontWeight: Number(e.target.value) as TextBlock["fontWeight"] })}
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
            <option value="sans">无衬线</option>
            <option value="serif">衬线</option>
            <option value="display">标题衬线</option>
          </select>
        </Field>
        <Field label="斜体">
          <select
            value={t.fontStyle ?? "normal"}
            onChange={(e) => onChange({ fontStyle: e.target.value as "normal" | "italic" })}
            style={inp}
          >
            <option value="normal">正常</option>
            <option value="italic">斜体</option>
          </select>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="对齐">
          <select
            value={t.align ?? "left"}
            onChange={(e) => onChange({ align: e.target.value as "left" | "center" | "right" })}
            style={inp}
          >
            <option value="left">左</option>
            <option value="center">中</option>
            <option value="right">右</option>
          </select>
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
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#555" }}>
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
