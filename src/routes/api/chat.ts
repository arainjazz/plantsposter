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
            enum: [
              "update_text",
              "update_style",
              "replace_all",
              "recolor_scheme",
              "set_image",
              "set_range_map",
            ],
          },
          id: { type: "string" },
          text: { type: "string" },
          src: { type: "string" },
          title: { type: "string" },
          subtitle: { type: "string" },
          source: { type: "string" },
          points: {
            type: "array",
            items: {
              type: "object",
              properties: {
                lat: { type: "number" },
                lon: { type: "number" },
                kind: { type: "string", enum: ["native", "introduced"] },
                label: { type: "string" },
              },
              required: ["lat", "lon"],
            },
          },
          fontSize: { type: "number" },
          color: { type: "string" },
          fontWeight: { type: "number" },
          fontStyle: { type: "string", enum: ["normal", "italic"] },
          align: { type: "string", enum: ["left", "center", "right"] },
          lineHeight: { type: "number" },
          letterSpacing: { type: "number" },
          fontFamily: {
            type: "string",
            enum: ["serif", "sans", "display", "kai", "wenkai", "mono", "playfair", "inter"],
          },
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
- recolor_scheme  : ink, accent, muted only (all #RRGGBB). NEVER output background.
- set_image       : id (must be an image block id), src (a full data:image/... URL or https URL).
- set_range_map   : id (image block id, e.g. img-map), points: [{ lat, lon, kind: "native"|"introduced", label? }],
                    optional title / subtitle / source. Use this for ANY "全球分布 / GLOBAL RANGE" map request —
                    the client automatically composes the SVG on top of the fixed Wikimedia CC0 base map
                    with the required projection formula. NEVER hand-craft the SVG yourself.

General rules:
- Use ONLY block ids from the provided catalog. Do not invent ids.
- When the user gives a vague instruction, pick reasonable values yourself.
- Colors must be #RRGGBB hex.
- If the user attaches an image, you may use it as visual reference (e.g. to pick a matching color palette).
- Do not change the poster background color/gradient/transparency through AI edits. Background is user-controlled only.
- If nothing needs changing, return an empty operations array and explain.
- Keep the message under 3 sentences.

═══════════════════════════════════════════════════════════════════════════
CONTENT SKILL — "重要提示"栏 (IMPORTANT NOTE)
═══════════════════════════════════════════════════════════════════════════
■ blocks: sec-note / sec-note-sub / sec-note-body
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

═══════════════════════════════════════════════════════════════════════════
CONTENT SKILL — "全球分布"栏 (GLOBAL RANGE) 与配图 SVG 规范
═══════════════════════════════════════════════════════════════════════════
■ 文本 blocks: sec-range / sec-range-sub / sec-range-caption
  - 底图使用真实 GBIF/POWO 记录或另一个可追溯、有文献支持的分布数据集。
    caption 记录：taxon key 或查询、筛选条件、记录数、下载/API URL、访问日期、局限性。
  - 不要凭空补点，不要臆造鄂尔多斯本地记录。原生 / 引入 / 不确定记录不得混绘。

■ 配图生成 (img-map 或"全球分布"图片块) — 必须使用 set_range_map
  当用户要求"生成全球分布图 / 分布地图 / GLOBAL RANGE 图"时，你只需输出一条
  set_range_map 操作，客户端会用固定不变的透明背景 Wikimedia CC0 底图和下面
  的回归投影公式自动合成 SVG。禁止你自己拼 SVG。

  投影公式 (客户端使用，仅供你在 message 中列出坐标凭证)：
      x = 2.6865 * lon + 449.3127
      y = -3.4451 * lat + 339.3522
    lon 东正西负；lat 北正南负。

  set_range_map 字段:
    - id       : 目标图片块 id (通常是 img-map)
    - points   : [{ lat, lon, kind: "native"|"introduced", label }]  真实点，勿臆造
    - title    : 例如 "Helianthemum songaricum · Global Distribution"
    - subtitle : 例如 "Wikimedia CC0 base · GBIF/POWO records"
    - source   : caption 一句话，写清数据源/查询/日期/许可证

  每个投影点必须在 message 中以文本凭证方式列出:
      "Xinjiang - Turpan: (lat 42.9, lon 89.2) -> (x 688.95, y 191.56)"
  证据不足时不要臆造点；宁少勿假。`;

type ChatBody = {
  message: string;
  model: string;
  blocks: Array<{ id: string; text?: string; role?: string }>;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  image?: { mimeType: string; data: string } | null;
  custom?: { baseURL: string; apiKey: string } | null;
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatBody;
        const model = body.model || "gemini-2.5-flash";
        const custom = body.custom;
        const key = process.env.GEMINI_API_KEY;
        if (!custom && !key) {
          return Response.json(
            { message: "Missing GEMINI_API_KEY (未配置后端环境变量，请在左上角『配置新模型』中填入你的 API Key)", operations: [] },
            { status: 200 }
          );
        }

        const catalog = body.blocks
          .map(
            (b) => `- ${b.id}${b.text ? `  :: "${b.text.slice(0, 80).replace(/\n/g, " ")}"` : ""}`,
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

        try {
          let text = "";
          if (custom) {
            // OpenAI-compatible chat completions (user-supplied model / endpoint)
            const messages: Array<Record<string, unknown>> = [
              { role: "system", content: SYSTEM },
              ...body.history.map((h) => ({ role: h.role, content: h.content })),
              {
                role: "user",
                content: body.image?.data
                  ? [
                      { type: "text", text: body.message },
                      {
                        type: "image_url",
                        image_url: { url: `data:${body.image.mimeType};base64,${body.image.data}` },
                      },
                    ]
                  : `Block catalog:\n${catalog}\n\nUser: ${body.message}`,
              },
            ];
            const upstream = await fetch(`${custom.baseURL.replace(/\/$/, "")}/chat/completions`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${custom.apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model,
                messages,
                response_format: { type: "json_object" },
                temperature: 0.6,
              }),
            });
            if (!upstream.ok) {
              const errText = await upstream.text();
              return Response.json(
                {
                  message: `自定义模型出错 (${upstream.status})：${errText.slice(0, 200)}`,
                  operations: [],
                },
                { status: 200 },
              );
            }
            const j = (await upstream.json()) as {
              choices?: Array<{ message?: { content?: string } }>;
            };
            text = j.choices?.[0]?.message?.content ?? "";
          } else {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
              model,
            )}:generateContent?key=${encodeURIComponent(key!)}`;
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
                {
                  message: `Gemini 出错 (${upstream.status})：${errText.slice(0, 200)}`,
                  operations: [],
                },
                { status: 200 },
              );
            }
            const json = (await upstream.json()) as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          }
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
          return Response.json({ message: `请求失败：${msg}`, operations: [] }, { status: 200 });
        }
      },
    },
  },
});
