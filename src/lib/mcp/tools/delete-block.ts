import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { publishServerState } from "@/lib/published-state.server";

import {
  assertRevision,
  errorResult,
  requirePublishedState,
  resolvePage,
  textResult,
} from "./state-utils";

export default defineTool({
  name: "delete_block",
  title: "Delete a poster block",
  description:
    "Delete one text or image block from a live poster page. Requires confirm=true and publishes a recoverable version snapshot.",
  inputSchema: {
    page: z.string().min(1).describe("Page id or exact page name."),
    blockId: z.string().min(1).max(160),
    expectedRevision: z.string().min(8).max(128).optional(),
    confirm: z.literal(true),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async ({ page, blockId, expectedRevision }) => {
    try {
      const published = await requirePublishedState();
      assertRevision(published.revision, expectedRevision);
      const state = structuredClone(published.state);
      const target = resolvePage(state, page);
      const block = target.blocks.find((candidate) => candidate.id === blockId);
      if (!block) throw new Error(`Block ${blockId} was not found.`);
      target.blocks = target.blocks.filter((candidate) => candidate.id !== blockId);
      const saved = await publishServerState(state);
      return textResult({
        ok: true,
        deleted: { id: block.id, type: block.type },
        page: { id: target.id, name: target.name },
        savedAt: saved.savedAt,
        revision: saved.revision,
        previousRevision: published.revision,
      });
    } catch (error) {
      return errorResult(error);
    }
  },
});
