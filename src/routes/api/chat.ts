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
              "update_image_label",
              "set_range_map",
            ],
          },
          id: { type: "string" },
          text: { type: "string" },
          label: { type: "string" },
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
                kind: { type: "string", enum: ["native", "introduced", "unknown"] },
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

const SYSTEM = `You are an editing assistant for a multi-page, bilingual (Chinese + English)
A3 plant field-guide editor built like Canva.

⚠ CRITICAL — THIS IS A MULTI-SPECIES GUIDE. Every page is about a DIFFERENT plant,
and you always edit exactly ONE page at a time. The "Block catalog" given in each
request is the CURRENT page's real content. FIRST determine which species THIS page
is about from that catalog (the largest title block + the Latin binomial + the
provided page name). Then keep every edit on-topic for THAT species only.
- NEVER assume the page is about 半日花 / Helianthemum songaricum. Do NOT insert
  半日花 names, text, examples, coordinates, or 鄂尔多斯/Ordos references unless the
  current page's catalog is genuinely about that species.
- NEVER change a page's main title / species to a different plant, and never rewrite
  a page to be about a species other than the one already shown in its catalog.
- If the catalog is about e.g. 梭梭 (Haloxylon ammodendron), all content, distribution
  points and examples you output must be about 梭梭 — not 半日花.

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
- set_image       : id (must be an image block id), src (a full data:image/... URL or https URL), optional label.
- update_image_label: id (an image block id), label. This label is the image alt description.
- set_range_map   : id (image block id, e.g. img-map), points: [{ lat, lon, kind: "native"|"introduced", label? }],
                    optional title / subtitle / source. Use this for ANY "全球分布 / GLOBAL RANGE" map request —
                    the client automatically composes the SVG on top of the fixed Wikimedia CC0 base map
                    with the required projection formula. NEVER hand-craft the SVG yourself.

General rules:
- Use ONLY block ids from the provided catalog. Do not invent ids.
- A request to revise, replace, correct, rewrite, or edit page content MUST return one or more operations that change the listed current-page blocks. Never say that you changed a page when operations is empty. If a request is unclear, choose the relevant current-page text blocks and make a conservative edit instead of replying conversationally only.
- Every image block is sent with its current alt description. When the user asks to edit a whole page,
  update each relevant image label with update_image_label so it accurately names THIS page's species
  and the image slot (main image, phenology, diagnostic trait, habitat, etc.). Never leave a 半日花
  or Helianthemum label on another species' page.
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
  - 只写物种本身的真实提示价值，绝不写“本页已修改 / 已校正 / 原来写错 / 本次替换”等编辑过程。
  - 不要与“植物人文”重复同一卖点：提示优先写安全、识别、保护边界或利用限制。
  - sec-note-sub 一行中英并列的副标题；sec-note-body 2-4 句中英对照正文。

═══════════════════════════════════════════════════════════════════════════
CONTENT SKILL — "植物人文"栏 (HUMANITIES)
═══════════════════════════════════════════════════════════════════════════
■ blocks: sec-hum / sec-hum-sub / sec-hum-body
  - 以与该物种直接相关的生活、生产、地方知识、食用、药用、民族志、经济利用、命名史或文学记载为优先。
  - 与重要提示选择不同角度；避免把保护口号、形态复述或泛泛“生态价值”换词重复。
  - 医疗、食用和民族志内容要保留证据与安全边界，不把实验研究写成疗效。

═══════════════════════════════════════════════════════════════════════════
CONTENT SKILL — "全球分布"栏 (GLOBAL RANGE) 与配图 SVG 规范
═══════════════════════════════════════════════════════════════════════════
■ 文本 blocks: sec-range / sec-range-sub / sec-range-caption
  - 底图使用真实 GBIF/POWO 记录或另一个可追溯、有文献支持的分布数据集；SVG 内不得写标题、图例、来源或“属性未定”。
  - 图例、taxon key/查询、筛选条件、记录数、访问日期和局限性都写入 sec-range-caption；它位于地图下方且可编辑。
  - 无 establishmentMeans 的 GBIF 坐标称为“参考范围内记录”，以青绿色显示；不要称作灰色“属性未定”，也不要误报为原生范围。
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
    - title    : "<当前页物种的拉丁名> · Global Distribution"（用本页实际物种，切勿写成半日花）
    - subtitle : 例如 "Wikimedia CC0 base · GBIF/POWO records"
    - source   : 用于地图下方可编辑说明的一句话，写清数据源/查询/日期/许可证

  每个投影点必须在 message 中以文本凭证方式列出（示例格式，坐标须为本页物种的真实记录）:
      "<地点>: (lat 42.9, lon 89.2) -> (x 688.95, y 191.56)"
  证据不足时不要臆造点；宁少勿假。若提供了联网检索结果(RESEARCH)，务必据其校正坐标。`;

type ChatBody = {
  message: string;
  model: string;
  pageName?: string;
  blocks: Array<{ id: string; text?: string; label?: string; role?: string }>;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  image?: { mimeType: string; data: string } | null;
  custom?: { baseURL: string; apiKey: string } | null;
};

// Best-effort web-search grounding: for research / distribution / verification
// requests, ask Gemini (with the googleSearch tool) to pull authoritative
// distribution data first, then feed that text into the structured edit call.
// Gemini can't combine googleSearch with responseSchema, so this is a separate
// pre-step; any failure is swallowed and the normal flow proceeds ungrounded.
const RESEARCH_RE =
  /(分布|distribut|范围|range|核查|校正|verify|检查|check|准确|正确|accurate|correct|联网|search|搜索|GBIF|POWO|iNaturalist|occurrence|坐标|coordinate)/i;

const MAP_REQUEST_RE =
  /(分布图|分布地图|全球分布|range\s*map|distribution\s*map|重绘.*分布|分布.*重绘)/i;

type GbifOccurrence = {
  decimalLatitude?: number;
  decimalLongitude?: number;
  establishmentMeans?: string;
  country?: string;
  stateProvince?: string;
};

function inferScientificName(body: ChatBody): string | null {
  const haystack = [body.pageName ?? "", ...body.blocks.map((b) => b.text ?? "")].join("\n");
  const matches = haystack.match(
    /\b[A-Z][a-z]{2,}\s+[a-z][a-z-]{2,}(?:\s+(?:subsp\.|var\.)\s+[a-z-]+)?\b/g,
  );
  return matches?.[0] ?? null;
}

async function buildGbifRangeMap(body: ChatBody) {
  const scientificName = inferScientificName(body);
  const target =
    body.blocks.find((b) => b.id === "img-map") ??
    body.blocks.find((b) => b.role === "image" && /map|range|分布/i.test(b.id));
  const captionTarget =
    body.blocks.find((b) => b.id === "sec-range-caption") ??
    body.blocks.find((b) => b.id.startsWith("sec-range-caption"));
  if (!scientificName || !target) return null;

  const matchRes = await fetch(
    `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientificName)}`,
  );
  if (!matchRes.ok) throw new Error(`GBIF species match failed (${matchRes.status})`);
  const match = (await matchRes.json()) as {
    usageKey?: number;
    scientificName?: string;
    confidence?: number;
  };
  if (!match.usageKey || (match.confidence ?? 0) < 80) {
    throw new Error(`GBIF could not confidently match ${scientificName}`);
  }

  const baseParams = new URLSearchParams({
    taxon_key: String(match.usageKey),
    has_coordinate: "true",
    has_geospatial_issue: "false",
  });
  const countRes = await fetch(`https://api.gbif.org/v1/occurrence/search?${baseParams}&limit=0`);
  if (!countRes.ok) throw new Error(`GBIF occurrence search failed (${countRes.status})`);
  const countJson = (await countRes.json()) as { count?: number };
  const count = countJson.count ?? 0;
  const maxOffset = Math.max(0, Math.min(count - 100, 99_900));
  const offsets = [
    ...new Set([0, 0.25, 0.5, 0.75, 1].map((p) => Math.floor((maxOffset * p) / 100) * 100)),
  ];
  const pages = await Promise.all(
    offsets.map(async (offset) => {
      const res = await fetch(
        `https://api.gbif.org/v1/occurrence/search?${baseParams}&limit=100&offset=${offset}`,
      );
      if (!res.ok) throw new Error(`GBIF occurrence page failed (${res.status})`);
      return (await res.json()) as { results?: GbifOccurrence[] };
    }),
  );
  const results = pages.flatMap((page) => page.results ?? []);

  // One representative record per 4-degree grid cell prevents dense collection
  // hotspots from hiding the overall range while retaining real GBIF coordinates.
  const cells = new Map<string, GbifOccurrence>();
  for (const row of results) {
    if (!Number.isFinite(row.decimalLatitude) || !Number.isFinite(row.decimalLongitude)) continue;
    const cell = `${Math.floor(row.decimalLatitude! / 4)},${Math.floor(row.decimalLongitude! / 4)}`;
    if (!cells.has(cell)) cells.set(cell, row);
  }
  const sampled = [...cells.values()].slice(0, 100);
  if (!sampled.length) throw new Error(`GBIF returned no usable coordinates for ${scientificName}`);
  const points = sampled.map((row) => {
    const means = (row.establishmentMeans ?? "").toLowerCase();
    const kind = means.includes("introduced")
      ? ("introduced" as const)
      : means.includes("native")
        ? ("native" as const)
        : ("unknown" as const);
    return {
      lat: row.decimalLatitude!,
      lon: row.decimalLongitude!,
      kind,
      label: [row.stateProvince, row.country].filter(Boolean).join(", ") || undefined,
    };
  });
  const accessed = new Date().toISOString().slice(0, 10);
  const acceptedName = match.scientificName ?? scientificName;
  return {
    message: `已直接核查 GBIF 并重绘 ${acceptedName} 的分布图：采用 ${points.length} 个经坐标质量过滤、4° 网格抽样的真实记录。没有 establishmentMeans 的记录以青绿色“参考范围内记录”显示，图例与来源已写入地图下方可编辑说明。`,
    operations: [
      {
        type: "set_range_map" as const,
        id: target.id,
        points,
        title: `${acceptedName} · Global Distribution`,
        subtitle: "GBIF occurrence records · Wikimedia CC0 base",
        source: `GBIF taxonKey ${match.usageKey}; ${count} matched records; stratified API sample, coordinate + geospatial-quality filters; accessed ${accessed}; https://www.gbif.org/species/${match.usageKey}`,
      },
      ...(captionTarget
        ? [
            {
              type: "update_text" as const,
              id: captionTarget.id,
              text: `青绿色点：GBIF 中未标注建立状态的参考范围内记录；橙色点：GBIF 标注的引入记录。点位不等于连续边界。数据：GBIF taxonKey ${match.usageKey}，${count} 条匹配记录，${accessed}（可编辑）。`,
            },
          ]
        : []),
    ],
  };
}

async function webSearchResearch(
  key: string,
  species: string,
  userMessage: string,
): Promise<string | null> {
  try {
    const prompt = `Research the authoritative GLOBAL native distribution of the plant species "${species}" using GBIF, Kew POWO / Plants of the World Online, and iNaturalist. Return a concise bullet list of representative real occurrence points as "Region/place: lat, lon (native|introduced)", plus the data sources (with taxon key / URL and access notes) and any range caveats. Focus on decimal lat/lon. User request: ${userMessage}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.2 },
      }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return text.trim() ? text.trim().slice(0, 4000) : null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatBody;
        const model = body.model || "gemini-2.5-flash";
        const custom = body.custom;
        const key = process.env.GEMINI_API_KEY;
        const lovableKey = process.env.LOVABLE_API_KEY;
        if (MAP_REQUEST_RE.test(body.message)) {
          try {
            const directMap = await buildGbifRangeMap(body);
            if (directMap) return Response.json(directMap);
          } catch (err) {
            const msg = err instanceof Error ? err.message : "unknown GBIF error";
            return Response.json({ message: `无法从 GBIF 安全重绘分布图：${msg}`, operations: [] });
          }
        }
        if (!custom && !key && !lovableKey) {
          return Response.json(
            {
              message:
                "未配置 LOVABLE_API_KEY 或 GEMINI_API_KEY（请在左上角『配置新模型』中填入可用 API Key）",
              operations: [],
            },
            { status: 200 },
          );
        }

        const catalog = body.blocks
          .map(
            (b) =>
              `- ${b.id}${b.text ? `  :: "${b.text.slice(0, 80).replace(/\n/g, " ")}"` : ""}${b.label ? `  [image alt: "${b.label.slice(0, 120)}"]` : ""}`,
          )
          .join("\n");

        const historyText = body.history
          .map((h) => `${h.role.toUpperCase()}: ${h.content}`)
          .join("\n");

        const species = (body.pageName || "").trim();
        // Web-search grounding for research/distribution requests (Gemini path only).
        let research: string | null = null;
        if (key && !custom && RESEARCH_RE.test(body.message)) {
          research = await webSearchResearch(key, species || catalog.slice(0, 200), body.message);
        }
        const contextText =
          `Current page name / species: ${species || "(infer from the catalog below)"}\n\n` +
          `Block catalog (THIS page's real content — base every edit on it):\n${catalog}\n\n` +
          (research
            ? `RESEARCH (authoritative web search results — use these to CORRECT distribution points and facts for THIS species):\n${research}\n\n`
            : "") +
          `Conversation so far:\n${historyText}\n\nUser: ${body.message}`;

        const userParts: Array<Record<string, unknown>> = [{ text: contextText }];
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
                      { type: "text", text: contextText },
                      {
                        type: "image_url",
                        image_url: { url: `data:${body.image.mimeType};base64,${body.image.data}` },
                      },
                    ]
                  : contextText,
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
          } else if (lovableKey) {
            // Prefer the project gateway for text edits too: a personal Gemini
            // key can be quota-limited while image generation already uses it.
            const gatewayModel = model.startsWith("google/") ? model : `google/${model}`;
            const messages: Array<Record<string, unknown>> = [
              { role: "system", content: SYSTEM },
              ...body.history.map((h) => ({ role: h.role, content: h.content })),
              {
                role: "user",
                content: body.image?.data
                  ? [
                      { type: "text", text: contextText },
                      {
                        type: "image_url",
                        image_url: { url: `data:${body.image.mimeType};base64,${body.image.data}` },
                      },
                    ]
                  : contextText,
              },
            ];
            const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableKey}`,
                "Lovable-API-Key": lovableKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: gatewayModel,
                messages,
                response_format: { type: "json_object" },
                temperature: 0.4,
              }),
            });
            if (!upstream.ok) {
              const errText = await upstream.text();
              return Response.json(
                {
                  message: `编辑网关出错 (${upstream.status})：${errText.slice(0, 200)}`,
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
