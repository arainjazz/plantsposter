import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import {
  getServerStateEnv,
  publishServerState,
  storeImageDataUrl,
} from "@/lib/published-state.server";

import {
  assertRevision,
  errorResult,
  requirePublishedState,
  resolvePage,
  textResult,
} from "./state-utils";

type GatewayResponse = {
  choices?: Array<{
    message?: {
      content?: string;
      images?: Array<{ image_url?: { url?: string } }>;
    };
  }>;
};

function extractDataUrl(response: GatewayResponse): string | null {
  const message = response.choices?.[0]?.message;
  const imageUrl = message?.images?.[0]?.image_url?.url;
  if (imageUrl?.startsWith("data:image/")) return imageUrl;
  if (typeof message?.content === "string") {
    return message.content.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/)?.[0] ?? null;
  }
  return null;
}

export default defineTool({
  name: "generate_image",
  title: "Generate, store, and optionally install a poster illustration",
  description:
    "Generate a poster image through Lovable AI Gateway, upload it to Supabase Storage, and return a compact permanent URL instead of a huge base64 payload. If page and blockId are both provided, installs the URL into that image block and publishes a versioned state update.",
  inputSchema: {
    prompt: z.string().min(4).max(4000).describe("Full image prompt; English usually works best."),
    model: z.string().min(2).max(160).optional().describe("Defaults to gemini-2.5-flash-image."),
    page: z.string().min(1).optional().describe("Optional target page id or exact name."),
    blockId: z.string().min(1).max(160).optional().describe("Optional target image block id."),
    label: z.string().max(500).optional(),
    expectedRevision: z.string().min(8).max(128).optional(),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  handler: async ({ prompt, model, page, blockId, label, expectedRevision }) => {
    try {
      if (!!page !== !!blockId) {
        throw new Error("page and blockId must be provided together when installing an image.");
      }
      const key = getServerStateEnv().LOVABLE_API_KEY;
      if (!key) throw new Error("Server is missing LOVABLE_API_KEY.");

      const shortModel = model || "gemini-2.5-flash-image";
      const gatewayModel = shortModel.startsWith("google/") ? shortModel : `google/${shortModel}`;
      const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: gatewayModel,
          messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
          modalities: ["image", "text"],
        }),
      });
      if (!upstream.ok) {
        const detail = await upstream.text();
        throw new Error(`Image gateway failed (${upstream.status}): ${detail.slice(0, 300)}`);
      }

      const dataUrl = extractDataUrl((await upstream.json()) as GatewayResponse);
      if (!dataUrl) throw new Error("The image model returned no supported image payload.");
      const stored = await storeImageDataUrl(dataUrl, blockId || "generated");

      if (!page || !blockId) {
        return textResult({
          ok: true,
          model: gatewayModel,
          image: stored,
          attached: false,
        });
      }

      const published = await requirePublishedState();
      assertRevision(published.revision, expectedRevision);
      const state = structuredClone(published.state);
      const targetPage = resolvePage(state, page);
      const targetBlock = targetPage.blocks.find((block) => block.id === blockId);
      if (!targetBlock) throw new Error(`Block ${blockId} was not found.`);
      if (targetBlock.type !== "image") throw new Error(`Block ${blockId} is not an image block.`);
      targetBlock.src = stored.url;
      if (label != null) targetBlock.label = label;
      delete targetBlock.crop;
      const saved = await publishServerState(state);

      return textResult({
        ok: true,
        model: gatewayModel,
        image: stored,
        attached: true,
        page: { id: targetPage.id, name: targetPage.name },
        blockId,
        savedAt: saved.savedAt,
        revision: saved.revision,
        previousRevision: published.revision,
      });
    } catch (error) {
      return errorResult(error);
    }
  },
});
