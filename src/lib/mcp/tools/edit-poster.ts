import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import type { Block, ImageBlock, TextBlock } from "@/lib/poster-data";
import { publishServerState } from "@/lib/published-state.server";

import {
  assertRevision,
  errorResult,
  requirePublishedState,
  resolvePage,
  textResult,
} from "./state-utils";

const blockId = z.string().min(1).max(160);
const cssValue = z.string().min(1).max(160);
const finite = z.number().finite();
const positive = z.number().finite().positive();
const fontFamily = z.enum([
  "serif",
  "sans",
  "display",
  "kai",
  "wenkai",
  "mono",
  "playfair",
  "inter",
]);
const cropSchema = z.object({
  left: z.number().min(0).max(100).optional(),
  right: z.number().min(0).max(100).optional(),
  top: z.number().min(0).max(100).optional(),
  bottom: z.number().min(0).max(100).optional(),
});

const operationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("update_text"),
    id: blockId,
    text: z.string().max(20_000),
  }),
  z.object({
    type: z.literal("update_style"),
    id: blockId,
    fontSize: positive.max(400).optional(),
    color: cssValue.optional(),
    fontWeight: z
      .union([z.literal(400), z.literal(500), z.literal(600), z.literal(700), z.literal(800)])
      .optional(),
    fontStyle: z.enum(["normal", "italic"]).optional(),
    fontFamily: fontFamily.optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    lineHeight: z.number().min(0.5).max(5).optional(),
    letterSpacing: z.number().min(-20).max(100).optional(),
    textTransform: z.enum(["none", "uppercase"]).optional(),
  }),
  z.object({
    type: z.literal("move_resize"),
    id: blockId,
    x: finite.optional(),
    y: finite.optional(),
    w: positive.max(5000).optional(),
    h: positive.max(5000).optional(),
  }),
  z.object({
    type: z.literal("set_image"),
    id: blockId,
    src: z.string().min(1).max(9_000_000),
    label: z.string().max(500).optional(),
    crop: cropSchema.nullable().optional(),
  }),
  z.object({
    type: z.literal("clear_image"),
    id: blockId,
  }),
  z.object({
    type: z.literal("set_crop"),
    id: blockId,
    crop: cropSchema.nullable(),
  }),
  z.object({
    type: z.literal("set_page_background"),
    color: cssValue,
  }),
  z.object({
    type: z.literal("set_palette"),
    background: cssValue.optional(),
    ink: cssValue.optional(),
    accent: cssValue.optional(),
    muted: cssValue.optional(),
  }),
  z.object({
    type: z.literal("add_text_block"),
    id: blockId.optional(),
    x: finite,
    y: finite,
    w: positive.max(5000),
    text: z.string().max(20_000),
    fontSize: positive.max(400),
    color: cssValue,
    fontWeight: z.union([
      z.literal(400),
      z.literal(500),
      z.literal(600),
      z.literal(700),
      z.literal(800),
    ]),
    fontStyle: z.enum(["normal", "italic"]).optional(),
    fontFamily: fontFamily.optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    lineHeight: z.number().min(0.5).max(5).optional(),
    letterSpacing: z.number().min(-20).max(100).optional(),
    textTransform: z.enum(["none", "uppercase"]).optional(),
  }),
  z.object({
    type: z.literal("add_image_block"),
    id: blockId.optional(),
    x: finite,
    y: finite,
    w: positive.max(5000),
    h: positive.max(5000),
    src: z.string().max(9_000_000).nullable().optional(),
    label: z.string().max(500),
    crop: cropSchema.optional(),
  }),
  z.object({
    type: z.literal("reorder_blocks"),
    orderedIds: z.array(blockId).min(1).max(500),
  }),
]);

function requireBlock(blocks: Block[], id: string): Block {
  const block = blocks.find((candidate) => candidate.id === id);
  if (!block) throw new Error(`Block ${id} was not found.`);
  return block;
}

function ensureNewBlockId(blocks: Block[], requested: string | undefined, prefix: string): string {
  const id = requested || `${prefix}-${crypto.randomUUID()}`;
  if (blocks.some((block) => block.id === id)) throw new Error(`Block id ${id} already exists.`);
  return id;
}

export default defineTool({
  name: "edit_poster",
  title: "Edit and publish poster blocks",
  description:
    "Atomically edit one live poster page and publish it with a version snapshot. Supports text/style, movement/size, setting or clearing images/crops, page background, palette, block creation, and exact layer order. Use delete_block for deletion. Call get_editor_state first and pass expectedRevision to prevent overwriting concurrent browser edits.",
  inputSchema: {
    page: z.string().min(1).describe("Target page id or exact page name."),
    expectedRevision: z.string().min(8).max(128).optional(),
    operations: z.array(operationSchema).min(1).max(100),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async ({ page, expectedRevision, operations }) => {
    try {
      const published = await requirePublishedState();
      assertRevision(published.revision, expectedRevision);
      const state = structuredClone(published.state);
      const target = resolvePage(state, page);
      const before = JSON.stringify({
        blocks: target.blocks,
        background: target.background,
        palette: state.palette,
      });
      const changedIds = new Set<string>();

      for (const operation of operations) {
        switch (operation.type) {
          case "update_text": {
            const block = requireBlock(target.blocks, operation.id);
            if (block.type !== "text")
              throw new Error(`Block ${operation.id} is not a text block.`);
            block.text = operation.text;
            changedIds.add(block.id);
            break;
          }
          case "update_style": {
            const block = requireBlock(target.blocks, operation.id);
            if (block.type !== "text")
              throw new Error(`Block ${operation.id} is not a text block.`);
            const patch = { ...operation } as Partial<TextBlock> & { type?: unknown; id?: string };
            delete patch.type;
            delete patch.id;
            Object.assign(block, patch);
            changedIds.add(block.id);
            break;
          }
          case "move_resize": {
            const block = requireBlock(target.blocks, operation.id);
            if (operation.h != null && block.type !== "image") {
              throw new Error(`Text block ${operation.id} does not have a height property.`);
            }
            if (operation.x != null) block.x = operation.x;
            if (operation.y != null) block.y = operation.y;
            if (operation.w != null) block.w = operation.w;
            if (operation.h != null && block.type === "image") block.h = operation.h;
            changedIds.add(block.id);
            break;
          }
          case "set_image": {
            const block = requireBlock(target.blocks, operation.id);
            if (block.type !== "image")
              throw new Error(`Block ${operation.id} is not an image block.`);
            block.src = operation.src;
            if (operation.label != null) block.label = operation.label;
            if (operation.crop === null) delete block.crop;
            else if (operation.crop) block.crop = operation.crop;
            changedIds.add(block.id);
            break;
          }
          case "clear_image": {
            const block = requireBlock(target.blocks, operation.id);
            if (block.type !== "image")
              throw new Error(`Block ${operation.id} is not an image block.`);
            block.src = null;
            delete block.crop;
            changedIds.add(block.id);
            break;
          }
          case "set_crop": {
            const block = requireBlock(target.blocks, operation.id);
            if (block.type !== "image")
              throw new Error(`Block ${operation.id} is not an image block.`);
            if (operation.crop === null) delete block.crop;
            else block.crop = operation.crop;
            changedIds.add(block.id);
            break;
          }
          case "set_page_background":
            target.background = operation.color;
            break;
          case "set_palette":
            state.palette = { ...state.palette, ...operation };
            delete (state.palette as typeof state.palette & { type?: unknown }).type;
            break;
          case "add_text_block": {
            const { type: _type, id: requestedId, ...properties } = operation;
            const block: TextBlock = {
              id: ensureNewBlockId(target.blocks, requestedId, "text"),
              type: "text",
              ...properties,
            };
            target.blocks.push(block);
            changedIds.add(block.id);
            break;
          }
          case "add_image_block": {
            const { type: _type, id: requestedId, ...properties } = operation;
            const block: ImageBlock = {
              id: ensureNewBlockId(target.blocks, requestedId, "image"),
              type: "image",
              src: null,
              ...properties,
            };
            target.blocks.push(block);
            changedIds.add(block.id);
            break;
          }
          case "reorder_blocks": {
            const currentIds = target.blocks.map((block) => block.id);
            const requested = new Set(operation.orderedIds);
            if (requested.size !== operation.orderedIds.length) {
              throw new Error("orderedIds contains duplicates.");
            }
            if (
              requested.size !== currentIds.length ||
              currentIds.some((id) => !requested.has(id))
            ) {
              throw new Error("orderedIds must contain every current block id exactly once.");
            }
            const byId = new Map(target.blocks.map((block) => [block.id, block]));
            target.blocks = operation.orderedIds.map((id) => byId.get(id) as Block);
            operation.orderedIds.forEach((id) => changedIds.add(id));
            break;
          }
        }
      }

      const after = JSON.stringify({
        blocks: target.blocks,
        background: target.background,
        palette: state.palette,
      });
      if (before === after) {
        return textResult({
          ok: true,
          unchanged: true,
          revision: published.revision,
          page: { id: target.id, name: target.name },
        });
      }

      const saved = await publishServerState(state);
      return textResult({
        ok: true,
        savedAt: saved.savedAt,
        revision: saved.revision,
        previousRevision: published.revision,
        externalizedImages: saved.externalizedImages,
        page: { id: target.id, name: target.name },
        changedIds: [...changedIds],
      });
    } catch (error) {
      return errorResult(error);
    }
  },
});
