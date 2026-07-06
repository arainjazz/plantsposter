import { useState } from "react";
import type { Block } from "@/lib/poster-data";
import type { Operation } from "@/lib/poster-ops";

type Msg = { role: "user" | "assistant"; content: string };

type Props = {
  blocks: Block[];
  onApplyOperations: (ops: Operation[]) => void;
};

export function AiChat({ blocks, onApplyOperations }: Props) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "你好，我是海报编辑助手。可以对我说：\n• 把标题“半 日 花”改成“沙生半日花”\n• 主色换成墨绿+米白\n• 所有小字号加大 2 号\n• 把 SIMILAR SPECIES 那栏正文改成斜体",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const nextHistory = [...messages, { role: "user" as const, content: text }];
    setMessages(nextHistory);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages,
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
            (data.operations?.length
              ? `\n\n✔ 已应用 ${data.operations.length} 处修改`
              : ""),
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fafaf7" }}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #eee", fontSize: 13, fontWeight: 600 }}>
        AI 编辑助手
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
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
      <div style={{ padding: 10, borderTop: "1px solid #eee", display: "flex", gap: 6 }}>
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
          disabled={loading || !input.trim()}
          style={{
            padding: "0 14px",
            background: "#2a2622",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: loading ? "wait" : "pointer",
            fontSize: 13,
          }}
        >
          发送
        </button>
      </div>
    </div>
  );
}
