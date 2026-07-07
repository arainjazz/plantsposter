import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

// Generate an image via Lovable AI Gateway. Codex receives a data URL it can
// download or embed. No user secret is exposed; the gateway key stays server-side.

export default defineTool({
  name: "generate_image",
  title: "Generate poster illustration",
  description:
    "Generate an illustration or reference photo for the poster via Lovable AI Gateway (google/gemini-2.5-flash-image). Returns a base64 data URL.",
  inputSchema: {
    prompt: z.string().min(4).max(4000).describe("Full image prompt (English works best)."),
    model: z
      .string()
      .optional()
      .describe("Optional short Gemini image model id, defaults to gemini-2.5-flash-image."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async ({ prompt, model }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return {
        content: [{ type: "text", text: "Server missing LOVABLE_API_KEY." }],
        isError: true,
      };
    }
    const short = model || "gemini-2.5-flash-image";
    const gatewayModel = short.startsWith("google/") ? short : `google/${short}`;
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: gatewayModel,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
        modalities: ["image", "text"],
      }),
    });
    if (!upstream.ok) {
      const errText = await upstream.text();
      return {
        content: [{ type: "text", text: `Gateway ${upstream.status}: ${errText.slice(0, 300)}` }],
        isError: true,
      };
    }
    const j = (await upstream.json()) as {
      choices?: Array<{
        message?: { content?: string; images?: Array<{ image_url?: { url?: string } }> };
      }>;
    };
    const msg = j.choices?.[0]?.message;
    let dataUrl = msg?.images?.[0]?.image_url?.url ?? null;
    if (!dataUrl && typeof msg?.content === "string") {
      const m = msg.content.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/);
      if (m) dataUrl = m[0];
    }
    if (!dataUrl) {
      return {
        content: [
          {
            type: "text",
            text: `Model returned no image. Raw: ${(msg?.content ?? "").slice(0, 200)}`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: dataUrl }],
      structuredContent: { dataUrl },
    };
  },
});
