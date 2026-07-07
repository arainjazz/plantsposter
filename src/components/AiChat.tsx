import { useState, useRef, useEffect } from "react";
import type { Block } from "@/lib/poster-data";
import type { Operation } from "@/lib/poster-ops";

type Msg = { role: "user" | "assistant"; content: string };

type Props = {
  blocks: Block[];
  selectedImageId: string | null;
  onApplyOperations: (ops: Operation[]) => void;
};

const GEMINI_MODELS = [
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash（默认）" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
  { id: "gemini-3-pro-preview", label: "Gemini 3 Pro" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
];

const IMAGE_MODELS = [
  { id: "gemini-2.5-flash-image", label: "Nano Banana · 2.5 Flash Image（快）" },
  { id: "gemini-3.1-flash-image", label: "Nano Banana 2 · 3.1 Flash Image" },
  { id: "gemini-3-pro-image", label: "Gemini 3 Pro Image（最好，慢）" },
];

const MODEL_KEY = "banrihua.gemini.model";
const IMG_MODEL_KEY = "banrihua.gemini.image_model";

export function AiChat({ blocks, selectedImageId, onApplyOperations }: Props) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "你好，我是页面编辑助理。\n• 说要改什么，我用 Gemini 生成编辑指令\n• 选中一个图片框，输入描述后点『生成配图』（走 Lovable AI Gateway，不再受个人配额限制）\n• 点『一键去背景』把选中的图片抠透明背景",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<string>(GEMINI_MODELS[0].id);
  const [imgModel, setImgModel] = useState<string>(IMAGE_MODELS[0].id);
  const [image, setImage] = useState<{ mimeType: string; data: string; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(MODEL_KEY);
    if (saved && GEMINI_MODELS.some((m) => m.id === saved)) setModel(saved);
    const savedImg = localStorage.getItem(IMG_MODEL_KEY);
    if (savedImg && IMAGE_MODELS.some((m) => m.id === savedImg)) setImgModel(savedImg);
  }, []);

  function pickModel(id: string) {
    setModel(id);
    localStorage.setItem(MODEL_KEY, id);
  }
  function pickImgModel(id: string) {
    setImgModel(id);
    localStorage.setItem(IMG_MODEL_KEY, id);
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const buf = await f.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    setImage({ mimeType: f.type || "image/png", data: btoa(bin), name: f.name });
    e.target.value = "";
  }

  async function send() {
    const text = input.trim();
    if ((!text && !image) || loading) return;
    setInput("");
    const userLabel = text + (image ? `\n📎 ${image.name}` : "");
    const nextHistory = [...messages, { role: "user" as const, content: userLabel }];
    setMessages(nextHistory);
    setLoading(true);
    const sentImage = image;
    setImage(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text || "(仅参考附图)",
          model,
          history: messages,
          image: sentImage ? { mimeType: sentImage.mimeType, data: sentImage.data } : null,
          blocks: blocks.map((b) => ({
            id: b.id,
            text: b.type === "text" ? b.text : undefined,
            role: b.type,
          })),
        }),
      });
      const data = (await res.json()) as { message: string; operations: Operation[] };
      onApplyOperations(data.operations ?? []);
      setMessages([
        ...nextHistory,
        {
          role: "assistant",
          content:
            data.message +
            (data.operations?.length ? `\n\n✔ 已应用 ${data.operations.length} 处修改` : ""),
        },
      ]);
    } catch (err) {
      setMessages([
        ...nextHistory,
        { role: "assistant", content: `请求失败：${err instanceof Error ? err.message : "unknown"}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function generateImage() {
    const text = input.trim();
    if (!text || loading) return;
    if (!selectedImageId) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "请先在画布上点选一个图片框，我再把生成的配图放进去。" },
      ]);
      return;
    }
    setInput("");
    const targetId = selectedImageId;
    const userLabel = `🖼️ 生成配图 → ${targetId}\n${text}` + (image ? `\n📎 ${image.name}` : "");
    const nextHistory = [...messages, { role: "user" as const, content: userLabel }];
    setMessages(nextHistory);
    setLoading(true);
    const ref = image;
    setImage(null);
    try {
      const res = await fetch("/api/gen-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          model: imgModel,
          reference: ref ? { mimeType: ref.mimeType, data: ref.data } : null,
        }),
      });
      const data = (await res.json()) as { dataUrl?: string; error?: string; text?: string };
      if (data.dataUrl) {
        onApplyOperations([{ type: "set_image", id: targetId, src: data.dataUrl }]);
        setMessages([
          ...nextHistory,
          { role: "assistant", content: `✔ 已生成并放入「${targetId}」${data.text ? `\n\n${data.text}` : ""}` },
        ]);
      } else {
        setMessages([
          ...nextHistory,
          { role: "assistant", content: data.error || "生成失败（无图像返回）" },
        ]);
      }
    } catch (err) {
      setMessages([
        ...nextHistory,
        { role: "assistant", content: `请求失败：${err instanceof Error ? err.message : "unknown"}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function updateKey() {
    alert(
      "在项目 Settings → Secrets 中更新 GEMINI_API_KEY；\n或者直接告诉我：\"更换 gemini api key\"，我会调用 update_secret 工具让你在安全表单里输入。\n\n注：图像生成已默认走 Lovable AI Gateway (LOVABLE_API_KEY)，一般不再受个人配额影响。",
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fafaf7" }}>
      {/* ── 顶部配置区 ─────────────────────────────────────── */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #eee", background: "white" }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>AI 页面编辑助理配置</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6 }}>
          <select
            value={model}
            onChange={(e) => pickModel(e.target.value)}
            style={cfgSel}
            title="文本模型 (Gemini)"
          >
            {GEMINI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <select
            value={imgModel}
            onChange={(e) => pickImgModel(e.target.value)}
            style={cfgSel}
            title="图像模型 (Nano Banana)"
          >
            {IMAGE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>🖼 {m.label}</option>
            ))}
          </select>
          <button onClick={updateKey} style={cfgBtn} title="更换 Gemini API Key">🔑 Key</button>
        </div>
      </div>

      {/* ── 对话区 ────────────────────────────────────────── */}
      <div
        style={{
          flex: 1, overflowY: "auto", padding: 12,
          display: "flex", flexDirection: "column", gap: 10,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%", padding: "8px 10px", borderRadius: 8,
              fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap",
              background: m.role === "user" ? "#2a2622" : "white",
              color: m.role === "user" ? "white" : "#222",
              border: m.role === "assistant" ? "1px solid #eee" : "none",
            }}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start", fontSize: 12, color: "#888" }}>思考中…</div>
        )}
      </div>

      {image && (
        <div style={{
          padding: "6px 12px", borderTop: "1px solid #eee",
          fontSize: 12, color: "#555", display: "flex", alignItems: "center", gap: 8,
        }}>
          <img
            src={`data:${image.mimeType};base64,${image.data}`}
            alt=""
            style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4 }}
          />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {image.name}
          </span>
          <button
            onClick={() => setImage(null)}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#888" }}
          >✕</button>
        </div>
      )}

      {/* ── 输入 + 发送 ─────────────────────────────────── */}
      <div style={{ padding: "10px 10px 6px", borderTop: "1px solid #eee", display: "flex", gap: 6, alignItems: "flex-end" }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="用中文或英文告诉我要改什么…（Enter 发送，Shift+Enter 换行）"
          rows={2}
          style={{
            flex: 1, resize: "none", border: "1px solid #d9d9d9",
            borderRadius: 6, padding: 8, fontSize: 13, fontFamily: "inherit",
          }}
        />
        <button
          onClick={send}
          disabled={loading || (!input.trim() && !image)}
          style={{
            padding: "0 16px", height: 46, background: "#2a2622", color: "white",
            border: "none", borderRadius: 6, cursor: loading ? "wait" : "pointer",
            fontSize: 13, opacity: loading || (!input.trim() && !image) ? 0.5 : 1,
          }}
        >发送</button>
      </div>

      {/* ── 动作行：上传 / 生成配图 / 去背景 ─────────────── */}
      <div style={{
        padding: "6px 10px 10px", display: "flex", gap: 6,
        borderTop: "1px dashed #eee",
      }}>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} style={{ display: "none" }} />
        <button onClick={() => fileRef.current?.click()} style={actBtn} title="附加参考图">📎 上传附件</button>
        <button
          onClick={generateImage}
          disabled={loading || !input.trim() || !selectedImageId}
          style={{
            ...actBtn,
            background: selectedImageId ? "#b0692b" : "#ded1c1",
            color: selectedImageId ? "white" : "#8a7a68",
            cursor: !selectedImageId || !input.trim() ? "not-allowed" : "pointer",
          }}
          title={selectedImageId ? "生成图并填入选中图片框" : "先在画布点选一个图片框"}
        >🖼️ 生成配图</button>
        <button
          onClick={async () => {
            if (!selectedImageId) {
              alert("请先在画布点选一个已含图片的图片框");
              return;
            }
            window.dispatchEvent(new CustomEvent("banrihua:remove-bg", { detail: { id: selectedImageId } }));
          }}
          disabled={!selectedImageId}
          style={{
            ...actBtn,
            background: selectedImageId ? "#5a7a5b" : "#d3dcd3",
            color: selectedImageId ? "white" : "#7a8a7a",
            cursor: !selectedImageId ? "not-allowed" : "pointer",
          }}
          title="一键去除选中图片的背景"
        >✨ 一键去背景</button>
      </div>
    </div>
  );
}

const cfgSel: React.CSSProperties = {
  fontSize: 11, padding: "4px 6px", border: "1px solid #ddd",
  borderRadius: 4, background: "white", width: "100%",
};
const cfgBtn: React.CSSProperties = {
  fontSize: 11, padding: "4px 8px", border: "1px solid #ddd",
  borderRadius: 4, background: "white", cursor: "pointer", whiteSpace: "nowrap",
};
const actBtn: React.CSSProperties = {
  flex: 1, padding: "8px 10px", border: "1px solid #d9d9d9",
  background: "white", borderRadius: 6, cursor: "pointer",
  fontSize: 12, whiteSpace: "nowrap",
};
