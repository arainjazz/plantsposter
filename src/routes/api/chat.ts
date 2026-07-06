import { createFileRoute } from "@tanstack/react-router";

// Whitelisted mutation operations that the AI can emit.
// Kept as a plain JSON-Schema object so we can pass it directly to Gemini's
// responseSchema field (Gemini supports a subset of OpenAPI 3.0 schema).
const OPERATIONS_SCHEMA = {
  type: "object",
  properties: {
    message: { type: "string" },
    operations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["update_text", "update_style", "replace_all", "recolor_scheme"],
          },
          id: { type: "string" },
          text: { type: "string" },
          fontSize: { type: "number" },
          color: { type: "string" },
          fontWeight: { type: "number" },
          fontStyle: { type: "string", enum: ["normal", "italic"] },
          align: { type: "string", enum: ["left", "center", "right"] },
          lineHeight: { type: "number" },
          letterSpacing: { type: "number" },
          fontFamily: { type: "string", enum: ["serif", "sans", "display"] },
          textTransform: { type: "string", enum: ["none", "uppercase"] },
          find: { type: "string" },
          replace: { type: "string" },
          caseSensitive: { type: "boolean" },
          background: { type: "string" },
          ink: { type: "string" },
          accent: { type: "string" },
          muted: { type: "string" },
        },
        required: ["type"],
      },
    },
  },
  required: ["message", "operations"],
};

const SYSTEM = `You are an editing assistant for a plant poster editor built like Canva.
The user speaks Chinese and English. The poster is a bilingual A3 portrait
about "半日花 Helianthemum songaricum".

You output JSON with:
- message: short reply in the user's language explaining what you changed (or asking for clarification).
- operations: list of edit operations to apply.

Operations available (set "type" plus the fields listed):
- update_text     : id, text
- update_style    : id, and any of fontSize (px), color (#RRGGBB), fontWeight (400-800),
                    fontStyle (normal|italic), align (left|center|right), lineHeight, letterSpacing,
                    fontFamily (serif|sans|display), textTransform (none|uppercase)
- replace_all     : find, replace, caseSensitive?
- recolor_scheme  : any of background, ink, accent, muted (all #RRGGBB)

General rules:
- Use ONLY block ids from the provided catalog. Do not invent ids.
- When the user gives a vague instruction, pick reasonable values yourself.
- Colors must be #RRGGBB hex.
- If the user attaches an image, you may use it as visual reference (e.g. to pick a matching color palette).
- If nothing needs changing, return an empty operations array and explain.
- Keep the message under 3 sentences.

═══════════════════════════════════════════════════════════════════════════
CONTENT SKILL — 使用以下规范生成"重要提示"与"全球分布"两栏文本
═══════════════════════════════════════════════════════════════════════════

■ IMPORTANT NOTE 面板  (blocks: sec-note / sec-note-sub / sec-note-body)
  - 标题固定为 "IMPORTANT NOTE · 重 要 提 示"，不要改动。
  - 主题不是固定的分类学栏目，须依据研究证据从以下候选中挑最有说服力、最
    影响读者理解海报的一项：
      · 毒性或安全 (toxicity / safety)
      · 保护地位或受威胁情况 (conservation status / threats)
      · 研究价值 (research value)
      · 商业或产业价值 (commercial / industry value)
      · 分类学分歧 (taxonomic disagreement)
      · 其他必要的警示或区分
  - 证据不足时不要硬凑主题；明确写出不确定性和分歧 ("尚有争议""证据有限"等)。
  - sec-note-sub 一行中英并列的副标题；sec-note-body 2-4 句中英对照正文。

■ GLOBAL RANGE 分布图与说明  (blocks: sec-range / sec-range-sub / img-map / sec-range-caption)
  - 底图使用真实 GBIF 记录或另一个可追溯、有文献支持的分布数据集。文字须
    记录：taxon key 或查询、筛选条件、记录数、下载/API URL、访问日期、局限性。
  - 地图为透明底世界线稿，覆盖层需克制，忽略南极洲。
    · 经核验的分布点用红色。
    · 有文献支持的原生分布范围用黄色区块或包络线。
    · 分布点须与原生范围底色可视区分。
  - 不要凭空补点，不要臆造鄂尔多斯本地记录。
  - 原生、栽培、引入、不确定记录不得混绘且不加标注。
  - sec-range-caption 用简洁中英双语写明：记录总数、筛选/去重方式、原生
    范围来源、主要局限。

════════════════════════════════════════════════════════════════════════════
当用户询问 "重要提示"、"IMPORTANT NOTE"、"分布" 或 "GLOBAL RANGE" 相关内容时，
按上述规范生成或修订 update_text 操作；如缺少证据，先在 message 中说明再改。`;

type ChatBody = {
  message: string;
  model: string;
  blocks: Array<{ id: string; text?: string; role?: string }>;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  image?: { mimeType: string; data: string } | null;
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.GEMINI_API_KEY;
        if (!key) return new Response("Missing GEMINI_API_KEY", { status: 500 });

        const body = (await request.json()) as ChatBody;
        const model = body.model || "gemini-2.5-flash";

        const catalog = body.blocks
          .map(
            (b) =>
              `- ${b.id}${b.text ? `  :: "${b.text.slice(0, 80).replace(/\n/g, " ")}"` : ""}`,
          )
          .join("\n");

        const historyText = body.history
          .map((h) => `${h.role.toUpperCase()}: ${h.content}`)
          .join("\n");

        const userParts: Array<Record<string, unknown>> = [
          {
            text: `Block catalog:\n${catalog}\n\nConversation so far:\n${historyText}\n\nUser: ${body.message}`,
          },
        ];
        if (body.image?.data) {
          userParts.push({
            inlineData: {
              mimeType: body.image.mimeType || "image/png",
              data: body.image.data,
            },
          });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model,
        )}:generateContent?key=${encodeURIComponent(key)}`;

        try {
          const upstream = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { role: "system", parts: [{ text: SYSTEM }] },
              contents: [{ role: "user", parts: userParts }],
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: OPERATIONS_SCHEMA,
                temperature: 0.6,
              },
            }),
          });

          if (!upstream.ok) {
            const errText = await upstream.text();
            console.error("gemini error", upstream.status, errText);
            return Response.json(
              { message: `Gemini 出错 (${upstream.status})：${errText.slice(0, 200)}`, operations: [] },
              { status: 200 },
            );
          }

          const json = (await upstream.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          let parsed: { message: string; operations: unknown[] };
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = { message: text || "(空回复)", operations: [] };
          }
          return Response.json(parsed);
        } catch (err) {
          console.error("chat error", err);
          const msg = err instanceof Error ? err.message : "unknown error";
          return Response.json(
            { message: `请求失败：${msg}`, operations: [] },
            { status: 200 },
          );
        }
      },
    },
  },
});
