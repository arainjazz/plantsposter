import { createFileRoute } from "@tanstack/react-router";

// Image generation. Prefers Lovable AI Gateway (LOVABLE_API_KEY) because
// personal GEMINI_API_KEY on free tier hits 429 quickly. Falls back to the
// user's own GEMINI_API_KEY when the gateway key is absent.
//
// Model IDs accepted from the client are the "short" Gemini ids
// (gemini-2.5-flash-image, gemini-3.1-flash-image, gemini-3-pro-image).
// We normalise them for the chosen backend.

type Body = {
  prompt: string;
  model?: string;
  reference?: { mimeType: string; data: string } | null;
  custom?: { baseURL: string; apiKey: string } | null;
};

const DEFAULT_MODEL = "gemini-2.5-flash-image";

export const Route = createFileRoute("/api/gen-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const prompt = (body.prompt || "").trim();
        if (!prompt) return Response.json({ error: "empty prompt" }, { status: 400 });

        const shortModel = body.model || DEFAULT_MODEL;
        const lovableKey = process.env.LOVABLE_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;

        // ── User-configured custom endpoint (highest priority) ──────────
        if (body.custom) {
          const { baseURL, apiKey } = body.custom;
          const parts: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
          if (body.reference?.data) {
            parts.push({
              type: "image_url",
              image_url: { url: `data:${body.reference.mimeType || "image/png"};base64,${body.reference.data}` },
            });
          }
          try {
            const upstream = await fetch(`${baseURL.replace(/\/$/, "")}/chat/completions`, {
              method: "POST",
              headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: shortModel,
                messages: [{ role: "user", content: parts }],
                modalities: ["image", "text"],
              }),
            });
            if (!upstream.ok) {
              return Response.json({ error: `自定义模型出错 (${upstream.status})：${(await upstream.text()).slice(0, 300)}` });
            }
            const j = (await upstream.json()) as {
              choices?: Array<{ message?: { content?: string; images?: Array<{ image_url?: { url?: string } }> } }>;
            };
            const msg = j.choices?.[0]?.message;
            const img0 = msg?.images?.[0]?.image_url?.url;
            if (img0) return Response.json({ dataUrl: img0 });
            if (typeof msg?.content === "string") {
              const m = msg.content.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/);
              if (m) return Response.json({ dataUrl: m[0] });
              return Response.json({ error: `模型未返回图像，原始回复：${msg.content.slice(0, 200)}` });
            }
            return Response.json({ error: "模型未返回图像" });
          } catch (err) {
            return Response.json({ error: `自定义模型请求失败：${err instanceof Error ? err.message : "unknown"}` });
          }
        }


        // ── Prefer Lovable AI Gateway ────────────────────────────────────
        if (lovableKey) {
          const gatewayModel = shortModel.startsWith("google/")
            ? shortModel
            : `google/${shortModel}`;

          const parts: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
          if (body.reference?.data) {
            const mime = body.reference.mimeType || "image/png";
            parts.push({
              type: "image_url",
              image_url: { url: `data:${mime};base64,${body.reference.data}` },
            });
          }

          try {
            const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: gatewayModel,
                messages: [{ role: "user", content: parts }],
                modalities: ["image", "text"],
              }),
            });

            if (!upstream.ok) {
              const errText = await upstream.text();
              // If gateway itself errors and user has a personal key, fall through.
              if (!geminiKey) {
                return Response.json({
                  error: `Gateway 出错 (${upstream.status})：${errText.slice(0, 300)}`,
                });
              }
              console.warn("gateway image error, falling back", upstream.status, errText);
            } else {
              const json = (await upstream.json()) as {
                choices?: Array<{
                  message?: {
                    content?: string;
                    images?: Array<{ image_url?: { url?: string } }>;
                  };
                }>;
              };
              const msg = json.choices?.[0]?.message;
              let dataUrl: string | null = null;
              let text = "";
              // Preferred: message.images[].image_url.url
              const img0 = msg?.images?.[0]?.image_url?.url;
              if (img0) dataUrl = img0;
              // Some responses put a data URL inside content
              if (!dataUrl && typeof msg?.content === "string") {
                const m = msg.content.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/);
                if (m) dataUrl = m[0];
                else text = msg.content;
              }
              if (dataUrl) return Response.json({ dataUrl, text });
              if (!geminiKey) {
                return Response.json({
                  error: `模型未返回图像。原始回复：${(msg?.content ?? "").slice(0, 200)}`,
                  text,
                });
              }
            }
          } catch (err) {
            if (!geminiKey) {
              const msg = err instanceof Error ? err.message : "unknown error";
              return Response.json({ error: `Gateway 请求失败：${msg}` });
            }
            console.warn("gateway threw, falling back", err);
          }
        }

        // ── Fallback: personal GEMINI_API_KEY (Google direct) ─────────────
        if (!geminiKey) {
          return Response.json({
            error: "未配置 LOVABLE_API_KEY 或 GEMINI_API_KEY。",
          });
        }

        const parts: Array<Record<string, unknown>> = [{ text: prompt }];
        if (body.reference?.data) {
          parts.push({
            inlineData: {
              mimeType: body.reference.mimeType || "image/png",
              data: body.reference.data,
            },
          });
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          shortModel,
        )}:generateContent?key=${encodeURIComponent(geminiKey)}`;

        try {
          const upstream = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts }],
              generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
            }),
          });
          if (!upstream.ok) {
            const errText = await upstream.text();
            return Response.json({
              error: `Gemini 出错 (${upstream.status})：${errText.slice(0, 300)}`,
            });
          }
          const json = (await upstream.json()) as {
            candidates?: Array<{
              content?: { parts?: Array<{ text?: string; inlineData?: { mimeType?: string; data?: string } }> };
              finishReason?: string;
            }>;
          };
          const parts0 = json.candidates?.[0]?.content?.parts ?? [];
          let dataUrl: string | null = null;
          let text = "";
          for (const p of parts0) {
            if (p.inlineData?.data && !dataUrl) {
              dataUrl = `data:${p.inlineData.mimeType || "image/png"};base64,${p.inlineData.data}`;
            }
            if (p.text) text += p.text;
          }
          if (!dataUrl) {
            return Response.json({
              error: `模型未返回图像 (finish=${json.candidates?.[0]?.finishReason ?? "?"}）`,
              text,
            });
          }
          return Response.json({ dataUrl, text });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "unknown error";
          return Response.json({ error: `请求失败：${msg}` });
        }
      },
    },
  },
});
