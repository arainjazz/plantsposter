import { useState, useRef, useEffect } from "react";
import type { Block } from "@/lib/poster-data";
import type { Operation } from "@/lib/poster-ops";

type Msg = { role: "user" | "assistant"; content: string };
type ApplyResult = { requested: number; applied: number; skipped: number };

type Props = {
  blocks: Block[];
  pageName?: string;
  selectedImageId: string | null;
  onApplyOperations: (ops: Operation[]) => Promise<ApplyResult>;
};

type ModelKind = "chat" | "image" | "native";
type ModelEntry = {
  id: string;
  label: string;
  kind: ModelKind;
  custom?: { baseURL: string; apiKey: string };
};

const BUILTIN_CHAT: ModelEntry[] = [
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash（默认）", kind: "chat" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", kind: "chat" },
  { id: "gemini-3-pro-preview", label: "Gemini 3 Pro", kind: "chat" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", kind: "chat" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", kind: "chat" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", kind: "chat" },
];

const BUILTIN_IMAGE: ModelEntry[] = [
  { id: "gemini-2.5-flash-image", label: "Nano Banana · 2.5 Flash Image（快）", kind: "image" },
  { id: "gemini-3.1-flash-image", label: "Nano Banana 2 · 3.1 Flash Image", kind: "image" },
  { id: "gemini-3-pro-image", label: "Gemini 3 Pro Image（最好，慢）", kind: "image" },
];

const MODEL_KEY = "banrihua.gemini.model";
const IMG_MODEL_KEY = "banrihua.gemini.image_model";
const CUSTOM_KEY = "banrihua.custom.models";

function loadCustom(): ModelEntry[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? (JSON.parse(raw) as ModelEntry[]) : [];
  } catch {
    return [];
  }
}
function saveCustom(list: ModelEntry[]) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
}

export function AiChat({ blocks, pageName, selectedImageId, onApplyOperations }: Props) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        '你好，我是页面编辑助理。\n• 说要改什么，我会生成并实际写入当前页面的编辑指令\n• 每次回复都会显示“已实际写入页面”的数量；未写入时会明确提示，不会假称已修改\n• 选中一个图片框，输入描述后点『生成配图』\n• 生成“全球分布图”时，我会按 Wikimedia CC0 底图 + 校正投影公式规范输出 SVG',
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<string>(BUILTIN_CHAT[0].id);
  const [imgModel, setImgModel] = useState<string>(BUILTIN_IMAGE[0].id);
  const [image, setImage] = useState<{ mimeType: string; data: string; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [customModels, setCustomModels] = useState<ModelEntry[]>([]);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(MODEL_KEY);
    if (saved) setModel(saved);
    const savedImg = localStorage.getItem(IMG_MODEL_KEY);
    if (savedImg) setImgModel(savedImg);
    setCustomModels(loadCustom());
  }, []);

  const allChat = [
    ...BUILTIN_CHAT,
    ...customModels.filter((m) => m.kind === "chat" || m.kind === "native"),
  ];
  const allImage = [
    ...BUILTIN_IMAGE,
    ...customModels.filter((m) => m.kind === "image" || m.kind === "native"),
  ];

  function pickModel(id: string) {
    setModel(id);
    localStorage.setItem(MODEL_KEY, id);
  }
  function pickImgModel(id: string) {
    setImgModel(id);
    localStorage.setItem(IMG_MODEL_KEY, id);
  }

  function addCustomModel(entry: ModelEntry) {
    const next = [...customModels.filter((m) => m.id !== entry.id), entry];
    setCustomModels(next);
    saveCustom(next);
    if (entry.kind === "chat") pickModel(entry.id);
    else pickImgModel(entry.id);
  }
  function removeCustom(id: string) {
    const next = customModels.filter((m) => m.id !== id);
    setCustomModels(next);
    saveCustom(next);
  }

  function currentCustom(id: string): { baseURL: string; apiKey: string } | null {
    const m = customModels.find((x) => x.id === id);
    return m?.custom ?? null;
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
          pageName,
          custom: currentCustom(model),
          history: messages,
          image: sentImage ? { mimeType: sentImage.mimeType, data: sentImage.data } : null,
          blocks: blocks.map((b) => ({
            id: b.id,
            text: b.type === "text" ? b.text : undefined,
            label: b.type === "image" ? b.label : undefined,
            role: b.type,
          })),
        }),
      });
      const data = (await res.json()) as { message: string; operations: Operation[] };
      const result = await onApplyOperations(data.operations ?? []);
      const outcome = result.applied
        ? `✔ 已实际写入页面：${result.applied} 处${result.skipped ? `；${result.skipped} 条未能匹配` : ""}`
        : data.operations?.length
          ? "⚠ 未写入页面：模型返回的操作没有匹配到当前页面内容。请重新发送，或指定要改的栏目。"
          : "⚠ 未写入页面：模型只回复了文字，没有生成编辑操作。";
      setMessages([
        ...nextHistory,
        {
          role: "assistant",
          content: `${data.message}\n\n${outcome}`,
        },
      ]);
    } catch (err) {
      setMessages([
        ...nextHistory,
        {
          role: "assistant",
          content: `请求失败：${err instanceof Error ? err.message : "unknown"}`,
        },
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
          custom: currentCustom(imgModel),
          reference: ref ? { mimeType: ref.mimeType, data: ref.data } : null,
        }),
      });
      const data = (await res.json()) as { dataUrl?: string; error?: string; text?: string };
      if (data.dataUrl) {
        const result = await onApplyOperations([{ type: "set_image", id: targetId, src: data.dataUrl }]);
        setMessages([
          ...nextHistory,
          {
            role: "assistant",
            content: result.applied
              ? `✔ 已生成并写入「${targetId}」${data.text ? `\n\n${data.text}` : ""}`
              : `⚠ 图像已生成，但没有写入当前页面的图片框「${targetId}」。`,
          },
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
        {
          role: "assistant",
          content: `请求失败：${err instanceof Error ? err.message : "unknown"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fafaf7" }}
    >
      {/* ── 顶部配置区 ─────────────────────────────────────── */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #eee", background: "white" }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>AI 页面编辑助理配置</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6 }}>
          <select
            value={model}
            onChange={(e) => pickModel(e.target.value)}
            style={cfgSel}
            title="文本模型"
          >
            {allChat.map((m) => (
              <option key={m.id} value={m.id}>
                {m.custom ? "⚙ " : ""}
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={imgModel}
            onChange={(e) => pickImgModel(e.target.value)}
            style={cfgSel}
            title="图像模型"
          >
            {allImage.map((m) => (
              <option key={m.id} value={m.id}>
                {m.custom ? "⚙ " : "🖼 "}
                {m.label}
              </option>
            ))}
          </select>
          <button onClick={() => setShowConfig(true)} style={cfgBtn} title="添加自定义模型 / API">
            ⚙ 配置新模型
          </button>
        </div>
      </div>

      {/* ── 对话区 ────────────────────────────────────────── */}
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
          <span
            style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
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

      {/* ── 输入 + 发送 ─────────────────────────────────── */}
      <div
        style={{
          padding: "10px 10px 6px",
          borderTop: "1px solid #eee",
          display: "flex",
          gap: 6,
          alignItems: "flex-end",
        }}
      >
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
            padding: "0 16px",
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

      {/* ── 动作行 ─────────────── */}
      <div
        style={{ padding: "6px 10px 10px", display: "flex", gap: 6, borderTop: "1px dashed #eee" }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onPickImage}
          style={{ display: "none" }}
        />
        <button onClick={() => fileRef.current?.click()} style={actBtn} title="附加参考图">
          📎 上传附件
        </button>
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
        >
          🖼️ 生成配图
        </button>
        <button
          onClick={() => {
            if (!selectedImageId) {
              alert("请先在画布点选一个已含图片的图片框");
              return;
            }
            window.dispatchEvent(
              new CustomEvent("banrihua:remove-bg", { detail: { id: selectedImageId } }),
            );
          }}
          disabled={!selectedImageId}
          style={{
            ...actBtn,
            background: selectedImageId ? "#5a7a5b" : "#d3dcd3",
            color: selectedImageId ? "white" : "#7a8a7a",
            cursor: !selectedImageId ? "not-allowed" : "pointer",
          }}
          title="一键去除选中图片的背景"
        >
          ✨ 一键去背景
        </button>
      </div>

      {showConfig && (
        <ConfigModal
          existing={customModels}
          onClose={() => setShowConfig(false)}
          onAdd={addCustomModel}
          onRemove={removeCustom}
        />
      )}
    </div>
  );
}

function ConfigModal({
  existing,
  onClose,
  onAdd,
  onRemove,
}: {
  existing: ModelEntry[];
  onClose: () => void;
  onAdd: (m: ModelEntry) => void;
  onRemove: (id: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [modelId, setModelId] = useState("");
  const [baseURL, setBaseURL] = useState("https://ai.gateway.lovable.dev/v1");
  const [apiKey, setApiKey] = useState("");
  const [kind, setKind] = useState<ModelKind>("chat");

  function submit() {
    if (!modelId.trim() || !baseURL.trim() || !apiKey.trim()) {
      alert("请填写：模型 ID、Base URL、API Key");
      return;
    }
    onAdd({
      id: modelId.trim(),
      label: label.trim() || modelId.trim(),
      kind,
      custom: { baseURL: baseURL.trim(), apiKey: apiKey.trim() },
    });
    setLabel("");
    setModelId("");
    setApiKey("");
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1500,
      }}
    >
      <div
        style={{
          width: 460,
          maxWidth: "92vw",
          background: "white",
          borderRadius: 10,
          padding: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700 }}>⚙ 配置新模型</div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 18,
              color: "#888",
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
          填写任意 OpenAI 兼容 endpoint（例如 Lovable AI Gateway、OpenAI、DeepSeek、OpenRouter
          等）。保存后模型会自动出现在上方下拉框，选中即生效。
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label style={fLbl}>
            类型
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ModelKind)}
              style={fInp}
            >
              <option value="chat">文本 / 编辑指令 (chat)</option>
              <option value="image">图像生成 (image)</option>
              <option value="native">原生多模态 (native · 同时支持文本+图像)</option>
            </select>
          </label>
          <label style={fLbl}>
            显示名称（可选）
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="例如：DeepSeek V3"
              style={fInp}
            />
          </label>
          <label style={fLbl}>
            模型 ID <span style={{ color: "#c33" }}>*</span>
            <input
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder="例如：google/gemini-2.5-flash 或 deepseek-chat"
              style={fInp}
            />
          </label>
          <label style={fLbl}>
            Base URL <span style={{ color: "#c33" }}>*</span>
            <input
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="https://api.openai.com/v1"
              style={fInp}
            />
          </label>
          <div
            style={{
              fontSize: 11,
              color: "#666",
              background: "#f7f5f0",
              padding: "8px 10px",
              borderRadius: 4,
              lineHeight: 1.55,
            }}
          >
            <b>
              Base URL 尾部 <code>/v1</code> 规则：
            </b>
            <br />✅ <b>需要</b> <code>/v1</code>：OpenAI (<code>https://api.openai.com/v1</code>
            )、Lovable Gateway (<code>https://ai.gateway.lovable.dev/v1</code>)、DeepSeek (
            <code>https://api.deepseek.com/v1</code>)、OpenRouter (
            <code>https://openrouter.ai/api/v1</code>
            )、Moonshot、通义、SiliconFlow、Together、Groq、Anthropic OpenAI-compat 等。
            <br />❌ <b>不要</b> <code>/v1</code>：Google Gemini 原生 API (
            <code>https://generativelanguage.googleapis.com</code>)、Azure OpenAI（用{" "}
            <code>/openai/deployments/&lt;name&gt;</code>）、Vertex AI、部分 Ollama 本地 (
            <code>http://localhost:11434</code>)。
            <br />
            <b>「原生多模态」</b>类型专为 Gemini 原生 / Anthropic 原生等<b>非</b> OpenAI
            兼容协议保留：填厂商官方 endpoint，无需 /v1。
          </div>
          <label style={fLbl}>
            API Key <span style={{ color: "#c33" }}>*</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              style={fInp}
            />
          </label>
        </div>

        <button
          onClick={submit}
          style={{
            marginTop: 14,
            width: "100%",
            padding: "10px 12px",
            background: "#2a2622",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          保存并激活
        </button>

        {existing.length > 0 && (
          <div style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#666" }}>
              已保存的自定义模型
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {existing.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    background: "#f7f5f0",
                    padding: "6px 8px",
                    borderRadius: 4,
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <b>{m.label}</b>{" "}
                    <span style={{ color: "#888" }}>
                      · {m.kind} · {m.id}
                    </span>
                  </span>
                  <button
                    onClick={() => onRemove(m.id)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#c33",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 14, fontSize: 11, color: "#888" }}>
          注意：API Key 只保存在你的浏览器 localStorage，随请求发送到本项目 /api/chat 或
          /api/gen-image 后端，再由后端调用你填写的 endpoint。
        </div>
      </div>
    </div>
  );
}

const cfgSel: React.CSSProperties = {
  fontSize: 11,
  padding: "4px 6px",
  border: "1px solid #ddd",
  borderRadius: 4,
  background: "white",
  width: "100%",
};
const cfgBtn: React.CSSProperties = {
  fontSize: 11,
  padding: "4px 8px",
  border: "1px solid #ddd",
  borderRadius: 4,
  background: "white",
  cursor: "pointer",
  whiteSpace: "nowrap",
};
const actBtn: React.CSSProperties = {
  flex: 1,
  padding: "8px 10px",
  border: "1px solid #d9d9d9",
  background: "white",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
  whiteSpace: "nowrap",
};
const fLbl: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  color: "#333",
};
const fInp: React.CSSProperties = {
  padding: "6px 8px",
  border: "1px solid #ddd",
  borderRadius: 4,
  fontSize: 12,
  fontFamily: "inherit",
};
