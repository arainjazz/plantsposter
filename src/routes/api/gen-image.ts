import { createFileRoute } from "@tanstack/react-router";

// Gemini image-generation endpoint. Uses Google generativelanguage direct API
// with the user's own GEMINI_API_KEY. Returns { dataUrl, text }.
//
// Models known to return image bytes:
//   gemini-2.5-flash-image        (Nano Banana, GA)
//   gemini-3.1-flash-image        (Nano Banana 2)
//   gemini-3.1-flash-image-preview
//   gemini-3-pro-image            (highest quality, slower)
//   gemini-3-pro-image-preview

type Body = {
  prompt: string;
  model?: string;
  reference?: { mimeType: string; data: string } | null;
};

const DEFAULT_MODEL = "gemini-2.5-flash-image";

export const Route = createFileRoute("/api/gen-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.GEMINI_API_KEY;
        if (!key) return new Response("Missing GEMINI_API_KEY", { status: 500 });

        const body = (await request.json()) as Body;
        const prompt = (body.prompt || "").trim();
        if (!prompt) return Response.json({ error: "empty prompt" }, { status: 400 });

        const model = body.model || DEFAULT_MODEL;

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
          model,
        )}:generateContent?key=${encodeURIComponent(key)}`;

        try {
          const upstream = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts }],
              generationConfig: {
                responseModalities: ["IMAGE", "TEXT"],
              },
            }),
          });

          if (!upstream.ok) {
            const errText = await upstream.text();
            console.error("gemini image error", upstream.status, errText);
            return Response.json(
              { error: `Gemini 出错 (${upstream.status})：${errText.slice(0, 300)}` },
              { status: 200 },
            );
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
              error: `模型未返回图像 (finish=${json.candidates?.[0]?.finishReason ?? "?"}）。请换用图像模型：gemini-2.5-flash-image / gemini-3.1-flash-image / gemini-3-pro-image。`,
              text,
            });
          }

          return Response.json({ dataUrl, text });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "unknown error";
          return Response.json({ error: `请求失败：${msg}` }, { status: 200 });
        }
      },
    },
  },
});
