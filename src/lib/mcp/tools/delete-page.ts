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
  name: "delete_page",
  title: "Delete a poster page",
  description:
    "Delete one live poster page and publish the result. Requires confirm=true and creates a recoverable version snapshot. The final remaining page cannot be deleted.",
  inputSchema: {
    page: z.string().min(1).describe("Page id or exact page name."),
    expectedRevision: z.string().min(8).max(128).optional(),
    confirm: z.literal(true),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async ({ page, expectedRevision }) => {
    try {
      const published = await requirePublishedState();
      assertRevision(published.revision, expectedRevision);
      if (published.state.pages.length <= 1) throw new Error("The final page cannot be deleted.");
      const state = structuredClone(published.state);
      const target = resolvePage(state, page);
      const index = state.pages.findIndex((item) => item.id === target.id);
      state.pages.splice(index, 1);
      if (state.activeId === target.id) {
        state.activeId = state.pages[Math.max(0, index - 1)]?.id ?? state.pages[0].id;
      }
      const saved = await publishServerState(state);
      return textResult({
        ok: true,
        deleted: { id: target.id, name: target.name },
        savedAt: saved.savedAt,
        revision: saved.revision,
        previousRevision: published.revision,
        activeId: saved.state.activeId,
      });
    } catch (error) {
      return errorResult(error);
    }
  },
});
