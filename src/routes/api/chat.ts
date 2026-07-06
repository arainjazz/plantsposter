import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { generateObject } from "ai";
import { z } from "zod";

// Whitelisted mutation operations that the AI can emit.
const OpSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("update_text"),
    id: z.string(),
    text: z.string(),
  }),
  z.object({
    type: z.literal("update_style"),
    id: z.string(),
    fontSize: z.number().optional(),
    color: z.string().optional(),
    fontWeight: z.number().optional(),
    fontStyle: z.enum(["normal", "italic"]).optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    lineHeight: z.number().optional(),
    letterSpacing: z.number().optional(),
    fontFamily: z.enum(["serif", "sans", "display"]).optional(),
    textTransform: z.enum(["none", "uppercase"]).optional(),
  }),
  z.object({
    type: z.literal("replace_all"),
    find: z.string(),
    replace: z.string(),
    caseSensitive: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("recolor_scheme"),
    background: z.string().optional(),
    ink: z.string().optional(),
    accent: z.string().optional(),
    muted: z.string().optional(),
  }),
]);

const ResponseSchema = z.object({
  message: z.string(),
  operations: z.array(OpSchema),
});

const SYSTEM = `You are an editing assistant for a plant poster editor built like Canva.
The user speaks Chinese and English. The poster is a single A3 portrait page about "半日花 Helianthemum songaricum".

You output JSON with:
- message: short reply in the user's language explaining what you changed (or asking for clarification).
- operations: list of edit operations to apply.

Operations available:
- update_text  {id, text}           replace the full text of a block
- update_style {id, ...styleProps}  fontSize (px), color (hex), fontWeight (400-800), fontStyle, align, lineHeight, letterSpacing, fontFamily (serif|sans|display), textTransform
- replace_all  {find, replace}      global find & replace across all text blocks
- recolor_scheme {background?, ink?, accent?, muted?}  swap the poster's four semantic colors (hex)

Rules:
- Use ONLY block ids from the provided catalog. Do not invent ids.
- When the user gives a vague instruction ("换个配色 / 更学术一点 / 标题小一点"), pick reasonable values yourself.
- Colors must be #RRGGBB hex.
- If nothing needs changing, return an empty operations list and explain.
- Keep the message under 3 sentences.`;

type ChatBody = {
  message: string;
  blocks: Array<{ id: string; text?: string; role?: string }>;
  history: Array<{ role: "user" | "assistant"; content: string }>;
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const body = (await request.json()) as ChatBody;
        const gateway = createLovableAiGatewayProvider(key);

        const catalog = body.blocks
          .map((b) => `- ${b.id}${b.text ? `  :: "${b.text.slice(0, 60).replace(/\n/g, " ")}"` : ""}`)
          .join("\n");

        const historyText = body.history
          .map((h) => `${h.role.toUpperCase()}: ${h.content}`)
          .join("\n");

        try {
          const { object } = await generateObject({
            model: gateway("google/gemini-2.5-flash"),
            schema: ResponseSchema,
            system: SYSTEM,
            prompt: `Block catalog:\n${catalog}\n\nConversation so far:\n${historyText}\n\nUser: ${body.message}`,
          });
          return Response.json(object);
        } catch (err) {
          console.error("chat error", err);
          const msg = err instanceof Error ? err.message : "unknown error";
          return Response.json(
            { message: `AI 出错了：${msg}`, operations: [] },
            { status: 200 },
          );
        }
      },
    },
  },
});
