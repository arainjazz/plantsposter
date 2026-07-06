import { useState, useRef, useEffect } from "react";
import type { Block } from "@/lib/poster-data";
import type { Operation } from "@/lib/poster-ops";

type Msg = { role: "user" | "assistant"; content: string };

type Props = {
  blocks: Block[];
  onApplyOperations: (ops: Operation[]) => void;
};

const GEMINI_MODELS = [
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash（默认·推荐）" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite（最快最省）" },
  { id: "gemini-3.5-pro", label: "Gemini 3.5 Pro（质量最高）" },
  { id: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image（图像生成/编辑）" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
];

const MODEL_KEY = "banrihua.gemini.model";

export function AiChat({ blocks, onApplyOperations }: Props) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "你好，我是海报编辑助手（Gemini 驱动）。可以：\n• 直接说要改什么，如「主色换成墨绿+米白」\n• 点 📎 上传参考图，如「照着这张图配色」\n• 右上角切换 Gemini 模型版本",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<string>(GEMINI_MODELS[0].id);
  const [image, setImage] = useState<{ mimeType: string; data: string; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(MODEL_KEY);
    if (saved && GEMINI_MODELS.some((m) => m.id === saved)) setModel(saved);
  }, []);

  function pickModel(id: string) {
    setModel(id);
    localStorage.setItem(MODEL_KEY, id);
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fafaf7" }}>
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid #eee",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>AI 编辑助手</span>
        <select
          value={model}
          onChange={(e) => pickModel(e.target.value)}
          style={{
            marginLeft: "auto",
            fontSize: 11,
            padding: "3px 6px",
            border: "1px solid #ddd",
            borderRadius: 4,
            background: "white",
            maxWidth: 200,
          }}
          title="Gemini 模型版本"
        >
          {GEMINI_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
              padding: "8px 10px",
              borderRadius: 8,
              fontSize: 13,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
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
        <div
          style={{
            padding: "6px 12px",
            borderTop: "1px solid #eee",
            fontSize: 12,
            color: "#555",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
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
          >
            ✕
          </button>
        </div>
      )}
      <div style={{ padding: 10, borderTop: "1px solid #eee", display: "flex", gap: 6, alignItems: "flex-end" }}>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} style={{ display: "none" }} />
        <button
          onClick={() => fileRef.current?.click()}
          title="附加参考图"
          style={{
            padding: "0 10px",
            height: 46,
            background: "white",
            border: "1px solid #d9d9d9",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          📎
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="用中文或英文告诉我要改什么…"
          rows={2}
          style={{
            flex: 1,
            resize: "none",
            border: "1px solid #d9d9d9",
            borderRadius: 6,
            padding: 8,
            fontSize: 13,
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={send}
          disabled={loading || (!input.trim() && !image)}
          style={{
            padding: "0 14px",
            height: 46,
            background: "#2a2622",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: loading ? "wait" : "pointer",
            fontSize: 13,
            opacity: loading || (!input.trim() && !image) ? 0.5 : 1,
          }}
        >
          发送
        </button>
      </div>
    </div>
  );
}
